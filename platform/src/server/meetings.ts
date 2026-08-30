/**
 * Meetings (doc §19).
 *
 * The chain that matters is Meeting → Minutes → Tasks → Owners → Deadlines →
 * Follow-up. Minutes that stop at prose are how decisions get lost, so a
 * decision with an owner is convertible into a real task, and the resulting
 * task id is kept on the decision — follow-up becomes verifiable rather than
 * remembered.
 */
import { MeetingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, scope, type Actor } from "@/lib/rbac";
import { Forbidden, createTask } from "@/server/tasks";

/** Shared transaction budget. Prisma's 2s default maxWait is too tight when
 *  the database round trip is long. */
const TX = { timeout: 20_000, maxWait: 10_000 };


export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  SCHEDULED: "निर्धारित",
  HELD: "सम्पन्न",
  CANCELLED: "रद्द",
};

export function listMeetings(actor: Actor) {
  const { where } = scope(actor);
  return db.meeting.findMany({
    where,
    include: {
      orgUnit: true,
      createdBy: true,
      decisions: { include: { owner: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { heldAt: "desc" },
  });
}

export async function scheduleMeeting(
  actor: Actor,
  input: { title: string; agenda: string; venue: string; heldAt: Date; orgUnitId: string },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('work.meeting_code_seq')
    `;
    const meeting = await tx.meeting.create({
      data: {
        code: `UKD-M-${new Date().getFullYear()}-${String(nextval).padStart(4, "0")}`,
        title: input.title,
        agenda: input.agenda,
        venue: input.venue,
        heldAt: input.heldAt,
        orgUnitId: unit.id,
        createdById: actor.userId,
      },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "meeting.schedule", entity: "Meeting", entityId: meeting.id,
      after: { code: meeting.code, orgUnitId: unit.id },
    });
    return meeting;
  }, TX);
}

/** Close a meeting out with minutes and the decisions taken. */
export async function recordMinutes(
  actor: Actor,
  meetingId: string,
  input: { minutes: string; attendance: number; decisions: string[] },
) {
  const { where } = scope(actor);
  const meeting = await db.meeting.findFirst({ where: { ...where, id: meetingId }, include: { orgUnit: true } });
  if (!meeting) throw new Forbidden();
  if (!canActOn(actor, meeting.orgUnit.path)) throw new Forbidden();
  if (meeting.status !== MeetingStatus.SCHEDULED) {
    throw new Forbidden("इस बैठक का कार्यवृत्त पहले ही दर्ज हो चुका है।");
  }

  const decisions = input.decisions.map((d) => d.trim()).filter(Boolean);

  return db.$transaction(async (tx) => {
    const updated = await tx.meeting.update({
      where: { id: meeting.id },
      data: { status: MeetingStatus.HELD, minutes: input.minutes, attendance: input.attendance },
    });
    if (decisions.length > 0) {
      await tx.decision.createMany({
        data: decisions.map((text) => ({ meetingId: meeting.id, text })),
      });
    }
    await recordIn(tx, {
      actorId: actor.userId, action: "meeting.minutes", entity: "Meeting", entityId: meeting.id,
      after: { attendance: input.attendance, decisions: decisions.length },
    });
    return updated;
  }, TX);
}

/**
 * Turn a decision into a task. This is the link doc §19 asks for, and the
 * reason minutes here are more than a document.
 */
export async function decisionToTask(
  actor: Actor,
  decisionId: string,
  input: { ownerId?: string; dueAt?: Date },
) {
  const decision = await db.decision.findUnique({
    where: { id: decisionId },
    include: { meeting: { include: { orgUnit: true } } },
  });
  if (!decision) throw new Forbidden();
  if (!canActOn(actor, decision.meeting.orgUnit.path)) throw new Forbidden();
  if (decision.taskId) throw new Forbidden("इस निर्णय से कार्य पहले ही बनाया जा चुका है।");

  const task = await createTask(actor, {
    title: decision.text.slice(0, 120),
    description: `बैठक ${decision.meeting.code} में लिया गया निर्णय।`,
    orgUnitId: decision.meeting.orgUnitId,
    ownerId: input.ownerId,
    dueAt: input.dueAt,
  });

  await db.$transaction(async (tx) => {
    await tx.decision.update({
      where: { id: decision.id },
      data: { taskId: task.id, ownerId: input.ownerId ?? null, dueAt: input.dueAt ?? null },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "decision.to_task", entity: "Decision", entityId: decision.id,
      after: { taskId: task.id, taskCode: task.code },
    });
  });

  return task;
}
