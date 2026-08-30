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

  return db.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        code: await nextCode(tx),
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

    await tx.taskEvent.create({
      data: { taskId: task.id, actorId: actor.userId, to: TaskStatus.ASSIGNED },
    });

    if (input.cascade) {
      const children = await tx.orgUnit.findMany({
        where: { parentId: unit.id, isActive: true },
      });
      for (const child of children) {
        const sub = await tx.task.create({
          data: {
            code: await nextCode(tx),
            title: input.title,
            description: input.description ?? null,
            createdById: actor.userId,
            orgUnitId: child.id,
            parentId: task.id,
            department: task.department,
            priority: task.priority,
            sensitivity: task.sensitivity,
            dueAt: task.dueAt,
          },
        });
        await tx.taskEvent.create({
          data: { taskId: sub.id, actorId: actor.userId, to: TaskStatus.ASSIGNED },
        });
      }
    }

    await recordIn(tx, {
      actorId: actor.userId,
      action: "task.create",
      entity: "Task",
      entityId: task.id,
      after: { title: task.title, orgUnitId: task.orgUnitId, cascade: !!input.cascade },
    });

    return task;
  });
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

/** A parent may close only once every cascaded child has closed. */
export async function parentIsClearable(taskId: string): Promise<boolean> {
  const open = await db.task.count({
    where: { parentId: taskId, status: { notIn: [TaskStatus.CLOSED, TaskStatus.REJECTED] } },
  });
  return open === 0;
}

async function nextCode(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear();
  const count = await tx.task.count();
  return `UKD-T-${year}-${String(count + 1).padStart(5, "0")}`;
}
