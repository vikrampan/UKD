/**
 * District health.
 *
 * Nothing new is collected here — the score is a rollup of obligations the
 * organisation already has: did the report arrive, did the circular get
 * acknowledged, did the task close, did the citizen get an answer. That
 * matters politically as well as technically: a district cannot improve its
 * score except by doing the work.
 *
 * Every figure comes from grouped queries rather than a pass per district, so
 * cost stays flat as the organisation grows.
 */
import { IssueStatus, ReportStatus, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { visiblePaths, type Actor } from "@/lib/rbac";

export type Facet = { done: number; total: number; pct: number | null };

export type DistrictHealth = {
  id: string;
  name: string;
  region: string;
  reports: Facet;
  tasks: Facet;
  issues: Facet;
  notices: Facet;
  /** 0–100, or null when the district owes nothing yet. */
  score: number | null;
};

const facet = (done: number, total: number): Facet => ({
  done,
  total,
  pct: total === 0 ? null : Math.round((done / total) * 100),
});

/**
 * Weighted so the things the party promises publicly count most: answering
 * citizens, then reporting, then internal task and circular discipline.
 */
const WEIGHTS = { issues: 0.35, reports: 0.3, tasks: 0.2, notices: 0.15 };

function score(h: Omit<DistrictHealth, "score">): number | null {
  const parts: [number, number][] = [];
  if (h.issues.pct !== null) parts.push([h.issues.pct, WEIGHTS.issues]);
  if (h.reports.pct !== null) parts.push([h.reports.pct, WEIGHTS.reports]);
  if (h.tasks.pct !== null) parts.push([h.tasks.pct, WEIGHTS.tasks]);
  if (h.notices.pct !== null) parts.push([h.notices.pct, WEIGHTS.notices]);
  if (parts.length === 0) return null;

  // Renormalise over the facets that actually apply, so a district with no
  // circulars yet is not punished for it.
  const weight = parts.reduce((a, [, w]) => a + w, 0);
  return Math.round(parts.reduce((a, [v, w]) => a + v * w, 0) / weight);
}

export async function districtHealth(actor: Actor): Promise<DistrictHealth[]> {
  const paths = visiblePaths(actor);

  const districts = await db.orgUnit.findMany({
    where: {
      type: "DISTRICT",
      isActive: true,
      ...(paths ? { OR: paths.map((p) => ({ path: { startsWith: p } })) } : {}),
    },
    include: { parent: true },
    orderBy: { name: "asc" },
  });
  if (districts.length === 0) return [];

  const ids = districts.map((d) => d.id);

  // Four grouped queries, not four per district.
  const [reportRows, taskRows, issueRows, noticeRows] = await Promise.all([
    db.unitReport.groupBy({
      by: ["orgUnitId", "status"],
      where: { orgUnitId: { in: ids } },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ["orgUnitId", "status"],
      where: { orgUnitId: { in: ids } },
      _count: { _all: true },
    }),
    db.issue.groupBy({
      by: ["orgUnitId", "status"],
      where: { orgUnitId: { in: ids } },
      _count: { _all: true },
    }),
    db.noticeReceipt.findMany({
      where: { user: { karyakarta: { orgUnitId: { in: ids } } } },
      select: { acknowledgedAt: true, user: { select: { karyakarta: { select: { orgUnitId: true } } } } },
    }),
  ]);

  const tally = <T extends { orgUnitId: string; _count: { _all: number } }>(
    rows: T[],
    isDone: (row: T) => boolean,
  ) => {
    const map = new Map<string, { done: number; total: number }>();
    for (const r of rows) {
      const cur = map.get(r.orgUnitId) ?? { done: 0, total: 0 };
      cur.total += r._count._all;
      if (isDone(r)) cur.done += r._count._all;
      map.set(r.orgUnitId, cur);
    }
    return map;
  };

  const reports = tally(reportRows, (r) => r.status === ReportStatus.SUBMITTED);
  const tasks = tally(taskRows, (r) =>
    r.status === TaskStatus.CLOSED || r.status === TaskStatus.APPROVED,
  );
  const issues = tally(issueRows, (r) =>
    r.status === IssueStatus.RESOLVED || r.status === IssueStatus.CLOSED,
  );

  const notices = new Map<string, { done: number; total: number }>();
  for (const r of noticeRows) {
    const unitId = r.user.karyakarta?.orgUnitId;
    if (!unitId) continue;
    const cur = notices.get(unitId) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (r.acknowledgedAt) cur.done += 1;
    notices.set(unitId, cur);
  }

  const empty = { done: 0, total: 0 };
  return districts.map((d) => {
    const base = {
      id: d.id,
      name: d.name,
      region: d.parent?.name ?? "",
      reports: facet(...(Object.values(reports.get(d.id) ?? empty) as [number, number])),
      tasks: facet(...(Object.values(tasks.get(d.id) ?? empty) as [number, number])),
      issues: facet(...(Object.values(issues.get(d.id) ?? empty) as [number, number])),
      notices: facet(...(Object.values(notices.get(d.id) ?? empty) as [number, number])),
    };
    return { ...base, score: score(base) };
  });
}

/** Statewide totals for the headline row. */
export function rollup(rows: DistrictHealth[]) {
  const scored = rows.filter((r) => r.score !== null);
  const sum = (pick: (r: DistrictHealth) => Facet) =>
    rows.reduce(
      (a, r) => ({ done: a.done + pick(r).done, total: a.total + pick(r).total }),
      { done: 0, total: 0 },
    );

  return {
    districts: rows.length,
    averageScore: scored.length
      ? Math.round(scored.reduce((a, r) => a + (r.score ?? 0), 0) / scored.length)
      : null,
    weak: scored.filter((r) => (r.score ?? 0) < 50).length,
    reports: sum((r) => r.reports),
    tasks: sum((r) => r.tasks),
    issues: sum((r) => r.issues),
  };
}
