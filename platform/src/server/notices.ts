/**
 * Circulars with read receipts.
 *
 * The value here is not distribution — it is the negative space. A receipt
 * row is created for every intended recipient the moment a notice is issued,
 * so "who has not read this" is a query rather than a guess, and nobody can
 * claim they were never told.
 */
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, scope, visiblePaths, type Actor } from "@/lib/rbac";
import { Forbidden } from "@/server/tasks";
import type { Department, Sensitivity } from "@prisma/client";

/** Notices addressed to this actor — their own inbox. */
export function myNotices(actor: Actor) {
  return db.noticeReceipt.findMany({
    where: { userId: actor.userId },
    include: { notice: { include: { orgUnit: true, issuedBy: true } } },
    orderBy: [{ readAt: "asc" }, { notice: { createdAt: "desc" } }],
  });
}

export async function unreadCount(actor: Actor): Promise<number> {
  return db.noticeReceipt.count({ where: { userId: actor.userId, readAt: null } });
}

/** Notices this actor can oversee, with read/ack tallies. */
export async function listNotices(actor: Actor) {
  const { where } = scope(actor);
  const notices = await db.notice.findMany({
    where,
    include: {
      orgUnit: true,
      issuedBy: true,
      _count: { select: { receipts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // One grouped query rather than a count per notice.
  const read = await db.noticeReceipt.groupBy({
    by: ["noticeId"],
    where: { noticeId: { in: notices.map((n) => n.id) }, readAt: { not: null } },
    _count: { _all: true },
  });
  const acked = await db.noticeReceipt.groupBy({
    by: ["noticeId"],
    where: { noticeId: { in: notices.map((n) => n.id) }, acknowledgedAt: { not: null } },
    _count: { _all: true },
  });

  const readBy = new Map(read.map((r) => [r.noticeId, r._count._all]));
  const ackBy = new Map(acked.map((r) => [r.noticeId, r._count._all]));

  return notices.map((n) => ({
    ...n,
    recipients: n._count.receipts,
    readCount: readBy.get(n.id) ?? 0,
    ackCount: ackBy.get(n.id) ?? 0,
  }));
}

/** Who has and has not read a given notice. The point of the whole module. */
export async function noticeReceipts(actor: Actor, noticeId: string) {
  const { where } = scope(actor);
  const notice = await db.notice.findFirst({
    where: { ...where, id: noticeId },
    include: { orgUnit: true, issuedBy: true },
  });
  if (!notice) return null;

  const receipts = await db.noticeReceipt.findMany({
    where: { noticeId },
    include: {
      user: {
        include: { karyakarta: { include: { orgUnit: true } } },
      },
    },
    orderBy: [{ readAt: "asc" }, { user: { name: "asc" } }],
  });

  return { notice, receipts };
}

export async function issueNotice(
  actor: Actor,
  input: {
    title: string;
    body: string;
    orgUnitId: string;
    department?: Department;
    sensitivity?: Sensitivity;
    requiresAck?: boolean;
    dueAt?: Date;
  },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path, input.department)) throw new Forbidden();

  // Everyone posted at or below the target unit.
  const recipients = await db.karyakarta.findMany({
    where: { isActive: true, orgUnit: { path: { startsWith: unit.path } } },
    select: { userId: true },
  });

  return db.$transaction(
    async (tx) => {
      const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
        SELECT nextval('work.notice_code_seq')
      `;

      const notice = await tx.notice.create({
        data: {
          code: `UKD-N-${new Date().getFullYear()}-${String(nextval).padStart(4, "0")}`,
          title: input.title,
          body: input.body,
          issuedById: actor.userId,
          orgUnitId: unit.id,
          department: input.department ?? "ORGANISATION",
          sensitivity: input.sensitivity ?? "INTERNAL",
          requiresAck: input.requiresAck ?? true,
          dueAt: input.dueAt ?? null,
        },
      });

      if (recipients.length > 0) {
        await tx.noticeReceipt.createMany({
          data: recipients.map((r) => ({ noticeId: notice.id, userId: r.userId })),
          skipDuplicates: true,
        });
      }

      await recordIn(tx, {
        actorId: actor.userId,
        action: "notice.issue",
        entity: "Notice",
        entityId: notice.id,
        after: { code: notice.code, orgUnitId: unit.id, recipients: recipients.length },
      });

      return notice;
    },
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/** Opening a notice. Idempotent — the first read is the one that counts. */
export async function markRead(actor: Actor, noticeId: string) {
  await db.noticeReceipt.updateMany({
    where: { noticeId, userId: actor.userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Explicit acknowledgement, which is a stronger claim than having opened it. */
export async function acknowledge(actor: Actor, noticeId: string) {
  const receipt = await db.noticeReceipt.findUnique({
    where: { noticeId_userId: { noticeId, userId: actor.userId } },
  });
  if (!receipt) throw new Forbidden();

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.noticeReceipt.update({
      where: { id: receipt.id },
      data: { readAt: receipt.readAt ?? now, acknowledgedAt: now },
    });
    await recordIn(tx, {
      actorId: actor.userId,
      action: "notice.acknowledge",
      entity: "Notice",
      entityId: noticeId,
    });
  });
}

/** Units an actor may address a circular to. */
export function addressableUnits(actor: Actor) {
  const paths = visiblePaths(actor);
  return db.orgUnit.findMany({
    where: {
      isActive: true,
      ...(paths ? { OR: paths.map((p) => ({ path: { startsWith: p } })) } : {}),
    },
    orderBy: [{ depth: "asc" }, { name: "asc" }],
    select: { id: true, name: true, depth: true },
  });
}
