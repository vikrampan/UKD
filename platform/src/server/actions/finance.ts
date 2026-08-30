"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LedgerKind } from "@prisma/client";
import { requireActor } from "@/lib/session";
import { recordEntry, decide, toPaise } from "@/server/finance";

export type FinanceState = { error?: string; ok?: boolean };

const Entry = z.object({
  kind: z.nativeEnum(LedgerKind),
  amount: z.string().min(1, "राशि लिखें।"),
  description: z.string().trim().min(4, "विवरण लिखें।"),
  counterparty: z.string().trim().optional(),
  reference: z.string().trim().optional(),
  occurredOn: z.string().min(1, "दिनांक चुनें।"),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
});

export async function recordEntryAction(
  _prev: FinanceState,
  formData: FormData,
): Promise<FinanceState> {
  const actor = await requireActor();

  const parsed = Entry.safeParse({
    kind: formData.get("kind"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    counterparty: formData.get("counterparty") || undefined,
    reference: formData.get("reference") || undefined,
    occurredOn: formData.get("occurredOn"),
    orgUnitId: formData.get("orgUnitId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  const amountPaise = toPaise(parsed.data.amount);
  if (amountPaise === null) {
    return { error: "राशि सही नहीं है — जैसे 2500 या 2500.50" };
  }

  try {
    await recordEntry(actor, {
      kind: parsed.data.kind,
      amountPaise,
      description: parsed.data.description,
      counterparty: parsed.data.counterparty,
      reference: parsed.data.reference,
      occurredOn: new Date(parsed.data.occurredOn),
      orgUnitId: parsed.data.orgUnitId,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "प्रविष्टि दर्ज नहीं हो सकी।" };
  }

  revalidatePath("/portal/finance");
  return { ok: true };
}

export async function decideAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(formData.get("entryId") ?? "");
  const approve = formData.get("decision") === "approve";
  const note = String(formData.get("note") ?? "").trim() || undefined;
  if (!id) return;

  await decide(actor, id, approve, note);
  revalidatePath("/portal/finance");
}
