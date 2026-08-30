/**
 * Weekly unit reporting.
 *
 * Opening a period writes a PENDING row for every unit that owes a return, so
 * "who has not reported" is a query rather than a diff against an expected
 * list. Overdue is derived from the period's deadline, never stored — a stored
 * flag would need a job to keep it honest and would be wrong between runs.
 */
import { ReportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, visiblePaths, type Actor } from "@/lib/rbac";
import { Forbidden } from "@/server/tasks";

/** ISO week code, e.g. 2026-W35. */
export function weekCode(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type ReportRow = {
  id: string;
  unitName: string;
  status: ReportStatus;
  submittedAt: Date | null;
  submittedBy: string | null;
  overdue: boolean;
  late: boolean;
  meetings: number | null;
  activities: number | null;
  newMembers: number | null;
};

/** Open a reporting window and create every unit's obligation. */
export async function openPeriod(
  actor: Actor,
  input: { startsOn: Date; endsOn: Date; dueAt: Date; orgUnitId: string },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();

  const code = weekCode(input.endsOn);
  const existing = await db.reportPeriod.findUnique({ where: { code } });
  if (existing) throw new Forbidden("इस सप्ताह की अवधि पहले से खुली है।");

  // Districts and below actually file; the party/state/region tiers aggregate.
  const units = await db.orgUnit.findMany({
    where: {
      isActive: true,
      path: { startsWith: unit.path },
      type: { in: ["DISTRICT", "ASSEMBLY", "BLOCK", "LOCAL_UNIT", "BOOTH"] },
    },
    select: { id: true },
  });

  return db.$transaction(
    async (tx) => {
      const period = await tx.reportPeriod.create({
        data: {
          code,
          startsOn: input.startsOn,
          endsOn: input.endsOn,
          dueAt: input.dueAt,
          createdById: actor.userId,
        },
      });

      if (units.length > 0) {
        await tx.unitReport.createMany({
          data: units.map((u) => ({ periodId: period.id, orgUnitId: u.id })),
          skipDuplicates: true,
        });
      }

      await recordIn(tx, {
        actorId: actor.userId,
        action: "report.period.open",
        entity: "ReportPeriod",
        entityId: period.id,
        after: { code, units: units.length, dueAt: input.dueAt.toISOString() },
      });

      return period;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

export function listPeriods() {
  return db.reportPeriod.findMany({
    orderBy: { endsOn: "desc" },
    include: { _count: { select: { reports: true } } },
    take: 12,
  });
}

/** Compliance for one period, scoped. Overdue computed against the deadline. */
export async function periodCompliance(
  actor: Actor,
  periodId: string,
): Promise<{ period: NonNullable<Awaited<ReturnType<typeof db.reportPeriod.findUnique>>>; rows: ReportRow[] } | null> {
  const period = await db.reportPeriod.findUnique({ where: { id: periodId } });
  if (!period) return null;

  const paths = visiblePaths(actor);
  const reports = await db.unitReport.findMany({
    where: {
      periodId,
      ...(paths ? { orgUnit: { OR: paths.map((p) => ({ path: { startsWith: p } })) } } : {}),
    },
    include: { orgUnit: true, submittedBy: true },
    orderBy: [{ status: "asc" }, { orgUnit: { name: "asc" } }],
  });

  const now = Date.now();
  const rows: ReportRow[] = reports.map((r) => ({
    id: r.id,
    unitName: r.orgUnit.name,
    status: r.status,
    submittedAt: r.submittedAt,
    submittedBy: r.submittedBy?.name ?? null,
    overdue: r.status === ReportStatus.PENDING && period.dueAt.getTime() < now,
    late: r.submittedAt !== null && r.submittedAt.getTime() > period.dueAt.getTime(),
    meetings: r.meetings,
    activities: r.activities,
    newMembers: r.newMembers,
  }));

  return { period, rows };
}

/** Returns this actor still owes — what a district admin sees on landing. */
export async function myOutstanding(actor: Actor) {
  const paths = visiblePaths(actor);
  return db.unitReport.findMany({
    where: {
      status: ReportStatus.PENDING,
      ...(paths ? { orgUnit: { OR: paths.map((p) => ({ path: { startsWith: p } })) } } : {}),
    },
    include: { orgUnit: true, period: true },
    orderBy: { period: { dueAt: "asc" } },
  });
}

export async function submitReport(
  actor: Actor,
  reportId: string,
  input: { meetings: number; activities: number; newMembers: number; notes?: string },
) {
  const report = await db.unitReport.findUnique({
    where: { id: reportId },
    include: { orgUnit: true, period: true },
  });
  if (!report) throw new Forbidden();
  if (!canActOn(actor, report.orgUnit.path)) throw new Forbidden();
  if (report.status === ReportStatus.SUBMITTED) {
    throw new Forbidden("यह रिपोर्ट पहले ही जमा हो चुकी है।");
  }

  const now = new Date();
  return db.$transaction(async (tx) => {
    const updated = await tx.unitReport.update({
      where: { id: report.id },
      data: {
        status: ReportStatus.SUBMITTED,
        submittedById: actor.userId,
        submittedAt: now,
        meetings: input.meetings,
        activities: input.activities,
        newMembers: input.newMembers,
        notes: input.notes ?? null,
      },
    });

    await recordIn(tx, {
      actorId: actor.userId,
      action: "report.submit",
      entity: "UnitReport",
      entityId: report.id,
      after: {
        unit: report.orgUnit.name,
        period: report.period.code,
        late: now.getTime() > report.period.dueAt.getTime(),
      },
    });

    return updated;
  });
}
