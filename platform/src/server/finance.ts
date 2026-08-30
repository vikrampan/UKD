/**
 * Party ledger — contributions in, expenses out, with approval.
 *
 * Scope note: this records and controls money movements and produces an
 * auditable trail. It is not an accounting package and does not attempt the
 * statutory returns a registered party owes (contribution reports, audited
 * annual accounts, election expenditure statements). Those need a chartered
 * accountant and are out of scope here by choice, not oversight.
 *
 * Two controls this module exists for:
 *   1. Amounts are integer paise. Never floats.
 *   2. Nobody approves their own entry.
 */
import { LedgerKind, LedgerStatus, Sensitivity } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, canApprove, clearanceOf, scope, type Actor } from "@/lib/rbac";
import { Forbidden } from "@/server/tasks";

export const KIND_LABEL: Record<LedgerKind, string> = {
  CONTRIBUTION: "सहयोग राशि",
  EXPENSE: "व्यय",
};

export const LEDGER_STATUS_LABEL: Record<LedgerStatus, string> = {
  DRAFT: "प्रारूप",
  PENDING_APPROVAL: "स्वीकृति लंबित",
  APPROVED: "स्वीकृत",
  REJECTED: "अस्वीकृत",
};

/** Rupees string → integer paise. Rejects anything that isn't clean money. */
export function toPaise(rupees: string): bigint | null {
  const trimmed = rupees.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  const paise = BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0"));
  return paise > 0n ? paise : null;
}

export function formatPaise(paise: bigint): string {
  const neg = paise < 0n;
  const abs = neg ? -paise : paise;
  const rupees = abs / 100n;
  const frac = String(abs % 100n).padStart(2, "0");
  return `${neg ? "−" : ""}₹${rupees.toLocaleString("en-IN")}.${frac}`;
}

/** Finance is CONFIDENTIAL, so clearance gates it before geography does. */
export function canSeeFinance(actor: Actor): boolean {
  const level = clearanceOf(actor);
  return level === Sensitivity.CONFIDENTIAL
    || level === Sensitivity.HIGHLY_CONFIDENTIAL
    || level === Sensitivity.SYSTEM;
}

export function listEntries(actor: Actor, filter: { status?: LedgerStatus } = {}) {
  const { where } = scope(actor);
  return db.ledgerEntry.findMany({
    where: { ...where, ...(filter.status ? { status: filter.status } : {}) },
    include: { orgUnit: true, createdBy: true, approvedBy: true },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
  });
}

/** Totals over what this actor may see. Approved money only. */
export async function totals(actor: Actor) {
  const { where } = scope(actor);
  const rows = await db.ledgerEntry.groupBy({
    by: ["kind"],
    where: { ...where, status: LedgerStatus.APPROVED },
    _sum: { amountPaise: true },
  });

  const pick = (k: LedgerKind) =>
    rows.find((r) => r.kind === k)?._sum.amountPaise ?? 0n;

  const income = pick(LedgerKind.CONTRIBUTION);
  const spend = pick(LedgerKind.EXPENSE);

  const pending = await db.ledgerEntry.count({
    where: { ...where, status: LedgerStatus.PENDING_APPROVAL },
  });

  return { income, spend, balance: income - spend, pending };
}

export async function recordEntry(
  actor: Actor,
  input: {
    kind: LedgerKind;
    amountPaise: bigint;
    description: string;
    counterparty?: string;
    reference?: string;
    occurredOn: Date;
    orgUnitId: string;
  },
) {
  if (!canSeeFinance(actor)) throw new Forbidden("वित्त तक पहुँच नहीं है।");

  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();
  if (input.amountPaise <= 0n) throw new Forbidden("राशि शून्य से अधिक होनी चाहिए।");

  return db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('work.ledger_code_seq')
    `;

    const entry = await tx.ledgerEntry.create({
      data: {
        code: `UKD-F-${new Date().getFullYear()}-${String(nextval).padStart(5, "0")}`,
        kind: input.kind,
        amountPaise: input.amountPaise,
        description: input.description,
        counterparty: input.counterparty ?? null,
        reference: input.reference ?? null,
        occurredOn: input.occurredOn,
        orgUnitId: unit.id,
        createdById: actor.userId,
        status: LedgerStatus.PENDING_APPROVAL,
      },
    });

    await recordIn(tx, {
      actorId: actor.userId,
      action: "ledger.record",
      entity: "LedgerEntry",
      entityId: entry.id,
      after: {
        code: entry.code,
        kind: entry.kind,
        amountPaise: entry.amountPaise.toString(),
        orgUnitId: unit.id,
      },
    });

    return entry;
  });
}

/**
 * Approve or reject. Separation of duties: the person who recorded an entry
 * can never be the one who approves it, whatever role they hold. Without
 * this, "every rupee accounted for" means nothing.
 */
export async function decide(
  actor: Actor,
  entryId: string,
  approve: boolean,
  note?: string,
) {
  if (!canSeeFinance(actor)) throw new Forbidden("वित्त तक पहुँच नहीं है।");
  if (!canApprove(actor)) throw new Forbidden();

  const { where } = scope(actor);
  const entry = await db.ledgerEntry.findFirst({
    where: { ...where, id: entryId },
    include: { orgUnit: true },
  });
  if (!entry) throw new Forbidden();

  if (entry.status !== LedgerStatus.PENDING_APPROVAL) {
    throw new Forbidden("इस प्रविष्टि पर पहले ही निर्णय हो चुका है।");
  }
  if (entry.createdById === actor.userId) {
    throw new Forbidden("अपनी ही प्रविष्टि को स्वीकृत नहीं किया जा सकता।");
  }
  if (!canActOn(actor, entry.orgUnit.path)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const updated = await tx.ledgerEntry.update({
      where: { id: entry.id },
      data: {
        status: approve ? LedgerStatus.APPROVED : LedgerStatus.REJECTED,
        approvedById: actor.userId,
        approvedAt: new Date(),
        decisionNote: note ?? null,
      },
    });

    await recordIn(tx, {
      actorId: actor.userId,
      action: approve ? "ledger.approve" : "ledger.reject",
      entity: "LedgerEntry",
      entityId: entry.id,
      before: { status: entry.status },
      after: { status: updated.status, note: note ?? null },
    });

    return updated;
  });
}
