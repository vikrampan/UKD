/**
 * Internal helpdesk (doc §21–22).
 *
 * Deliberately different from the citizen grievance pipeline: a ticket is
 * raised by someone who already has an account, is routed by department
 * rather than geography alone, and the person who raised it can always see it
 * even when their geographic scope would not otherwise include the unit.
 */
import { Department, Priority, TicketStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, scope, type Actor } from "@/lib/rbac";
import { Forbidden } from "@/server/tasks";

/** Shared transaction budget. Prisma's 2s default maxWait is too tight when
 *  the database round trip is long. */
const TX = { timeout: 20_000, maxWait: 10_000 };


export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "खुला",
  ASSIGNED: "सौंपा गया",
  IN_PROGRESS: "प्रगति पर",
  RESOLVED: "हल हुआ",
  CLOSED: "बंद",
};

export const TICKET_ACTION_LABEL: Record<TicketStatus, string> = {
  OPEN: "पुनः खोलें",
  ASSIGNED: "स्वयं लें",
  IN_PROGRESS: "कार्य शुरू करें",
  RESOLVED: "हल दर्ज करें",
  CLOSED: "बंद करें",
};

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.ASSIGNED],
  ASSIGNED: [TicketStatus.IN_PROGRESS],
  IN_PROGRESS: [TicketStatus.RESOLVED],
  RESOLVED: [TicketStatus.CLOSED],
  CLOSED: [],
};

export async function raiseTicket(
  actor: Actor,
  input: {
    title: string; details: string; department: Department;
    priority: Priority; orgUnitId: string;
  },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('work.ticket_code_seq')
    `;
    const ticket = await tx.ticket.create({
      data: {
        code: `UKD-H-${String(nextval).padStart(5, "0")}`,
        title: input.title,
        details: input.details,
        department: input.department,
        priority: input.priority,
        orgUnitId: unit.id,
        raisedById: actor.userId,
      },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "ticket.raise", entity: "Ticket", entityId: ticket.id,
      after: { code: ticket.code, department: ticket.department },
    });
    return ticket;
  }, TX);
}

/**
 * Tickets in scope, plus the actor's own wherever they were raised — someone
 * must always be able to follow a request they filed themselves.
 */
export function listTickets(actor: Actor) {
  const { where } = scope(actor);
  return db.ticket.findMany({
    where: { OR: [where, { raisedById: actor.userId }] },
    include: { orgUnit: true, raisedBy: true, assignedTo: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export function allowedTicketTransitions(
  actor: Actor,
  ticket: { status: TicketStatus; orgUnit: { path: string }; department: Department },
): TicketStatus[] {
  if (!canActOn(actor, ticket.orgUnit.path, ticket.department)) return [];
  return TRANSITIONS[ticket.status];
}

export async function advanceTicket(
  actor: Actor,
  ticketId: string,
  to: TicketStatus,
  resolution?: string,
) {
  const { where } = scope(actor);
  const ticket = await db.ticket.findFirst({
    where: { AND: [{ id: ticketId }, { OR: [where, { raisedById: actor.userId }] }] },
    include: { orgUnit: true },
  });
  if (!ticket) throw new Forbidden();
  if (!TRANSITIONS[ticket.status].includes(to)) throw new Forbidden("यह स्थिति परिवर्तन संभव नहीं है।");
  if (!canActOn(actor, ticket.orgUnit.path, ticket.department)) throw new Forbidden();
  if (to === TicketStatus.RESOLVED && !resolution?.trim()) {
    throw new Forbidden("हल का विवरण लिखे बिना टिकट हल नहीं किया जा सकता।");
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: to,
        assignedToId: to === TicketStatus.ASSIGNED ? actor.userId : ticket.assignedToId,
        resolution: resolution?.trim() ?? ticket.resolution,
        resolvedAt: to === TicketStatus.RESOLVED ? new Date() : ticket.resolvedAt,
      },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "ticket.advance", entity: "Ticket", entityId: ticket.id,
      before: { status: ticket.status }, after: { status: to },
    });
    return updated;
  }, TX);
}
