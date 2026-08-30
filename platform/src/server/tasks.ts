/**
 * Task service — the reference module.
 *
 * Every later module (events, meetings, documents, helpdesk) should copy this
 * shape: RBAC scope on every read, an explicit transition table, and an audit
 * row written in the same transaction as the change.
 */
import { Prisma, TaskStatus } from "@prisma/client";
import type { Department, Priority, Sensitivity } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, canApprove, scope, type Actor } from "@/lib/rbac";

/** Doc §9, including the rejection loop. Anything not listed is refused. */
const TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  ASSIGNED: [TaskStatus.ACCEPTED, TaskStatus.REJECTED],
  ACCEPTED: [TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.SUBMITTED],
  SUBMITTED: [TaskStatus.UNDER_REVIEW],
  UNDER_REVIEW: [TaskStatus.APPROVED, TaskStatus.CORRECTION_REQUIRED],
  CORRECTION_REQUIRED: [TaskStatus.RESUBMITTED],
  RESUBMITTED: [TaskStatus.UNDER_REVIEW],
  APPROVED: [TaskStatus.CLOSED],
  REJECTED: [],
  CLOSED: [],
};

/** Transitions only a reviewer may make. Karyakartas never approve — doc §3. */
const REVIEWER_ONLY = new Set<TaskStatus>([
  TaskStatus.UNDER_REVIEW,
  TaskStatus.APPROVED,
  TaskStatus.CORRECTION_REQUIRED,
  TaskStatus.REJECTED,
  TaskStatus.CLOSED,
]);

export class Forbidden extends Error {
  constructor(message = "इस कार्रवाई की अनुमति नहीं है") {
    super(message);
    this.name = "Forbidden";
  }
}

export class InvalidTransition extends Error {
  constructor(from: TaskStatus, to: TaskStatus) {
    super(`कार्य की स्थिति ${from} से ${to} नहीं की जा सकती`);
    this.name = "InvalidTransition";
  }
}

/** Tasks this actor may see. Never call db.task.findMany directly. */
export function listTasks(
  actor: Actor,
  filter: { status?: TaskStatus; department?: Department; ownedByMe?: boolean } = {},
) {
  const { where } = scope(actor, { department: filter.department });
  return db.task.findMany({
    where: {
      ...where,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.ownedByMe ? { ownerId: actor.userId } : {}),
    },
    include: { orgUnit: true, owner: true },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
  });
}

/** Single task, scoped. Returns null rather than throwing on no-access, so
 *  callers render a 404 and don't leak that the row exists. */
export async function getTask(actor: Actor, id: string) {
  const { where } = scope(actor);
  return db.task.findFirst({
    where: { ...where, id },
    include: {
      orgUnit: true,
      owner: true,
      createdBy: true,
      children: { include: { orgUnit: true } },
      events: { include: { actor: true }, orderBy: { at: "desc" } },
    },
  });
}

export async function createTask(
  actor: Actor,
  input: {
    title: string;
    description?: string;
    orgUnitId: string;
    ownerId?: string;
    department?: Department;
    priority?: Priority;
    sensitivity?: Sensitivity;
    dueAt?: Date;
    /** Doc §8 — also create one child task per unit directly below. */
    cascade?: boolean;
  },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path, input.department)) throw new Forbidden();

  return db.$transaction(
    async (tx) => {
      const children = input.cascade
        ? await tx.orgUnit.findMany({ where: { parentId: unit.id, isActive: true } })
        : [];

      const codes = await reserveCodes(tx, 1 + children.length);

      const task = await tx.task.create({
        data: {
          code: codes[0],
          title: input.title,
          description: input.description ?? null,
          createdById: actor.userId,
          ownerId: input.ownerId ?? null,
          orgUnitId: unit.id,
          department: input.department ?? "ORGANISATION",
          priority: input.priority ?? "MEDIUM",
          sensitivity: input.sensitivity ?? "INTERNAL",
          dueAt: input.dueAt ?? null,
        },
      });

      // Doc §8 — one child task per unit directly below. Batched, so a
      // 13-district cascade costs a couple of statements, not dozens.
      if (children.length > 0) {
        await tx.task.createMany({
          data: children.map((child, i) => ({
            code: codes[i + 1],
            title: task.title,
            description: task.description,
            createdById: actor.userId,
            orgUnitId: child.id,
            parentId: task.id,
            department: task.department,
            priority: task.priority,
            sensitivity: task.sensitivity,
            dueAt: task.dueAt,
          })),
        });
      }

      const created = await tx.task.findMany({
        where: { OR: [{ id: task.id }, { parentId: task.id }] },
        select: { id: true },
      });
      await tx.taskEvent.createMany({
        data: created.map((t) => ({
          taskId: t.id,
          actorId: actor.userId,
          to: TaskStatus.ASSIGNED,
        })),
      });

      await recordIn(tx, {
        actorId: actor.userId,
        action: "task.create",
        entity: "Task",
        entityId: task.id,
        after: { title: task.title, orgUnitId: task.orgUnitId, cascade: children.length },
      });

      return task;
    },
    // Generous because the database may be a long way from the app server; a
    // wide cascade still has to fit inside one transaction.
    { timeout: 20_000, maxWait: 10_000 },
  );
}

/** Move a task along the lifecycle. The only way task status ever changes. */
export async function transition(
  actor: Actor,
  taskId: string,
  to: TaskStatus,
  note?: string,
) {
  const { where } = scope(actor);
  const task = await db.task.findFirst({ where: { ...where, id: taskId }, include: { orgUnit: true } });
  if (!task) throw new Forbidden();

  if (!TRANSITIONS[task.status].includes(to)) throw new InvalidTransition(task.status, to);
  if (REVIEWER_ONLY.has(to) && !canApprove(actor, task.department)) throw new Forbidden();
  if (!canActOn(actor, task.orgUnit.path, task.department)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const updated = await tx.task.update({
      where: { id: task.id },
      data: {
        status: to,
        completedAt: to === TaskStatus.CLOSED ? new Date() : task.completedAt,
      },
    });

    await tx.taskEvent.create({
      data: { taskId: task.id, actorId: actor.userId, from: task.status, to, note: note ?? null },
    });

    await recordIn(tx, {
      actorId: actor.userId,
      action: "task.transition",
      entity: "Task",
      entityId: task.id,
      before: { status: task.status },
      after: { status: to, note: note ?? null },
    });

    return updated;
  });
}

/**
 * Transitions this actor may actually perform on this task right now — the
 * lifecycle table intersected with their authority. The UI renders buttons
 * from this, so it can never offer an action the service would refuse.
 */
export function allowedTransitions(
  actor: Actor,
  task: { status: TaskStatus; department: Department; orgUnit: { path: string } },
): TaskStatus[] {
  if (!canActOn(actor, task.orgUnit.path, task.department)) return [];
  const reviewer = canApprove(actor, task.department);
  return TRANSITIONS[task.status].filter((to) => !REVIEWER_ONLY.has(to) || reviewer);
}

/** Hindi labels for the action a transition represents. */
export const TRANSITION_LABEL: Record<TaskStatus, string> = {
  ASSIGNED: "सौंपें",
  ACCEPTED: "स्वीकार करें",
  IN_PROGRESS: "कार्य शुरू करें",
  SUBMITTED: "पूर्ण होने पर जमा करें",
  UNDER_REVIEW: "समीक्षा शुरू करें",
  APPROVED: "स्वीकृत करें",
  CORRECTION_REQUIRED: "सुधार हेतु लौटाएँ",
  RESUBMITTED: "पुनः जमा करें",
  REJECTED: "अस्वीकार करें",
  CLOSED: "बंद करें",
};

/** Hindi labels for the state a task is in. */
export const STATUS_LABEL: Record<TaskStatus, string> = {
  ASSIGNED: "सौंपा गया",
  ACCEPTED: "स्वीकृत",
  IN_PROGRESS: "प्रगति पर",
  SUBMITTED: "जमा",
  UNDER_REVIEW: "समीक्षाधीन",
  APPROVED: "अनुमोदित",
  CORRECTION_REQUIRED: "सुधार आवश्यक",
  RESUBMITTED: "पुनः जमा",
  REJECTED: "अस्वीकृत",
  CLOSED: "बंद",
};

/** A parent may close only once every cascaded child has closed. */
export async function parentIsClearable(taskId: string): Promise<boolean> {
  const open = await db.task.count({
    where: { parentId: taskId, status: { notIn: [TaskStatus.CLOSED, TaskStatus.REJECTED] } },
  });
  return open === 0;
}

/**
 * Reserve `n` task codes in one round trip.
 *
 * Uses a Postgres sequence rather than COUNT(*): atomic under concurrency,
 * and one query regardless of how many codes the cascade needs.
 */
async function reserveCodes(tx: Prisma.TransactionClient, n: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('work.task_code_seq') FROM generate_series(1, ${n})
  `;
  const year = new Date().getFullYear();
  return rows.map((r) => `UKD-T-${year}-${String(r.nextval).padStart(5, "0")}`);
}
