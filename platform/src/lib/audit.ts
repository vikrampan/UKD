/**
 * Append-only audit trail (doc §35).
 *
 * There is deliberately no update or delete helper here. The migration also
 * revokes UPDATE/DELETE on audit.AuditLog from the application role, so the
 * guarantee holds even if someone later reaches for `db.auditLog` directly.
 */
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  ip?: string | null;
};

export async function record(input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      ip: input.ip ?? null,
    },
  });
}

/**
 * Write an audit row inside an existing transaction, so the record and its
 * audit entry commit or fail together.
 */
export async function recordIn(
  tx: Prisma.TransactionClient,
  input: AuditInput,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      before: input.before ?? undefined,
      after: input.after ?? undefined,
      ip: input.ip ?? null,
    },
  });
}
