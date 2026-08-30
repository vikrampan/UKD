/**
 * Public grievances from the जन पोर्टल.
 *
 * Two audiences: citizens, who submit and track by code without any account,
 * and the organisation, which sees them scoped by geography. Deliberately
 * holds only what is needed to route and resolve — doc §6 data minimisation.
 */
import { IssueStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, scopeGeo, type Actor } from "@/lib/rbac";
import { Forbidden } from "@/server/tasks";

const TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  RECEIVED: [IssueStatus.ASSIGNED],
  ASSIGNED: [IssueStatus.IN_PROGRESS],
  IN_PROGRESS: [IssueStatus.RESOLVED],
  RESOLVED: [IssueStatus.CLOSED],
  CLOSED: [],
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  RECEIVED: "प्राप्त",
  ASSIGNED: "सौंपा गया",
  IN_PROGRESS: "प्रगति पर",
  RESOLVED: "हल हुआ",
  CLOSED: "बंद",
};

export const ISSUE_ACTION_LABEL: Record<IssueStatus, string> = {
  RECEIVED: "प्राप्त दर्ज करें",
  ASSIGNED: "इकाई को सौंपें",
  IN_PROGRESS: "कार्य शुरू करें",
  RESOLVED: "हल हुआ चिह्नित करें",
  CLOSED: "बंद करें",
};

/** Citizen-facing: submit without an account. */
export async function submitIssue(input: {
  category: string;
  title: string;
  details: string;
  citizenName: string;
  citizenPhone: string;
  locality?: string;
  orgUnitId: string;
  ip?: string | null;
}) {
  return db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('work.issue_code_seq')
    `;
    const code = `UKD-${new Date().getFullYear()}-${String(nextval).padStart(4, "0")}`;

    const issue = await tx.issue.create({
      data: {
        code,
        category: input.category,
        title: input.title,
        details: input.details,
        citizenName: input.citizenName,
        citizenPhone: input.citizenPhone,
        locality: input.locality ?? null,
        orgUnitId: input.orgUnitId,
      },
    });

    await recordIn(tx, {
      action: "issue.submit",
      entity: "Issue",
      entityId: issue.id,
      after: { code, category: issue.category, orgUnitId: issue.orgUnitId },
      ip: input.ip ?? null,
    });

    return issue;
  });
}

/**
 * Citizen-facing tracking. Returns only what the citizen needs to see, never
 * internal fields, and takes the code alone — no account, by design.
 */
export async function trackIssue(code: string) {
  const issue = await db.issue.findUnique({
    where: { code: code.trim().toUpperCase() },
    select: {
      code: true,
      title: true,
      category: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      orgUnit: { select: { name: true } },
    },
  });
  return issue;
}

/** Organisation-facing, geography-scoped. */
export function listIssues(actor: Actor, filter: { status?: IssueStatus } = {}) {
  const { where } = scopeGeo(actor);
  return db.issue.findMany({
    where: { ...where, ...(filter.status ? { status: filter.status } : {}) },
    include: { orgUnit: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getIssue(actor: Actor, id: string) {
  const { where } = scopeGeo(actor);
  return db.issue.findFirst({ where: { ...where, id }, include: { orgUnit: true } });
}

export function allowedIssueTransitions(
  actor: Actor,
  issue: { status: IssueStatus; orgUnit: { path: string } },
): IssueStatus[] {
  if (!canActOn(actor, issue.orgUnit.path)) return [];
  return TRANSITIONS[issue.status];
}

export async function advanceIssue(actor: Actor, id: string, to: IssueStatus) {
  const { where } = scopeGeo(actor);
  const issue = await db.issue.findFirst({ where: { ...where, id }, include: { orgUnit: true } });
  if (!issue) throw new Forbidden();
  if (!TRANSITIONS[issue.status].includes(to)) throw new Forbidden("यह स्थिति परिवर्तन संभव नहीं है");
  if (!canActOn(actor, issue.orgUnit.path)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const updated = await tx.issue.update({
      where: { id: issue.id },
      data: { status: to, resolvedAt: to === IssueStatus.RESOLVED ? new Date() : issue.resolvedAt },
    });
    await recordIn(tx, {
      actorId: actor.userId,
      action: "issue.advance",
      entity: "Issue",
      entityId: issue.id,
      before: { status: issue.status },
      after: { status: to },
    });
    return updated;
  });
}
