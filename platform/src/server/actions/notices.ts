"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActor } from "@/lib/session";
import { issueNotice, acknowledge } from "@/server/notices";

const Issue = z.object({
  title: z.string().trim().min(4, "सूचना का शीर्षक लिखें।"),
  body: z.string().trim().min(10, "सूचना का विवरण लिखें।"),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
  requiresAck: z.boolean().default(true),
  dueAt: z.string().optional(),
});

export type NoticeState = { error?: string };

export async function issueNoticeAction(
  _prev: NoticeState,
  formData: FormData,
): Promise<NoticeState> {
  const actor = await requireActor();

  const parsed = Issue.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    orgUnitId: formData.get("orgUnitId"),
    requiresAck: formData.get("requiresAck") === "on",
    dueAt: formData.get("dueAt") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };
  }

  const { dueAt, ...rest } = parsed.data;
  try {
    await issueNotice(actor, { ...rest, dueAt: dueAt ? new Date(dueAt) : undefined });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "सूचना जारी नहीं हो सकी।" };
  }

  revalidatePath("/portal/notices");
  redirect("/portal/notices");
}

export async function acknowledgeAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(formData.get("noticeId") ?? "");
  if (!id) return;

  await acknowledge(actor, id);
  revalidatePath("/portal/notices");
  revalidatePath(`/portal/notices/${id}`);
}
