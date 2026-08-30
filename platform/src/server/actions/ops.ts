"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Department, Priority, TicketStatus } from "@prisma/client";
import { requireActor } from "@/lib/session";
import { raiseTicket, advanceTicket } from "@/server/helpdesk";
import { scheduleMeeting, recordMinutes, decisionToTask } from "@/server/meetings";

export type OpsState = { error?: string; ok?: string };

/* ── helpdesk ── */

const TicketInput = z.object({
  title: z.string().trim().min(4, "शीर्षक लिखें।"),
  details: z.string().trim().min(10, "विवरण लिखें।"),
  department: z.nativeEnum(Department).default(Department.IT),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
});

export async function raiseTicketAction(_p: OpsState, fd: FormData): Promise<OpsState> {
  const actor = await requireActor();
  const parsed = TicketInput.safeParse({
    title: fd.get("title"), details: fd.get("details"),
    department: fd.get("department") || undefined, priority: fd.get("priority") || undefined,
    orgUnitId: fd.get("orgUnitId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  try { await raiseTicket(actor, parsed.data); }
  catch (e) { return { error: e instanceof Error ? e.message : "टिकट दर्ज नहीं हुआ।" }; }

  revalidatePath("/portal/helpdesk");
  return { ok: "टिकट दर्ज हो गया।" };
}

export async function advanceTicketAction(fd: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(fd.get("ticketId") ?? "");
  const to = String(fd.get("to") ?? "") as TicketStatus;
  const resolution = String(fd.get("resolution") ?? "").trim() || undefined;
  if (!id || !(to in TicketStatus)) return;

  await advanceTicket(actor, id, to, resolution);
  revalidatePath("/portal/helpdesk");
}

/* ── meetings ── */

const MeetingInput = z.object({
  title: z.string().trim().min(4, "बैठक का शीर्षक लिखें।"),
  agenda: z.string().trim().min(10, "कार्यसूची लिखें।"),
  venue: z.string().trim().min(2, "स्थान लिखें।"),
  heldAt: z.string().min(1, "दिनांक चुनें।"),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
});

export async function scheduleMeetingAction(_p: OpsState, fd: FormData): Promise<OpsState> {
  const actor = await requireActor();
  const parsed = MeetingInput.safeParse({
    title: fd.get("title"), agenda: fd.get("agenda"), venue: fd.get("venue"),
    heldAt: fd.get("heldAt"), orgUnitId: fd.get("orgUnitId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  try { await scheduleMeeting(actor, { ...parsed.data, heldAt: new Date(parsed.data.heldAt) }); }
  catch (e) { return { error: e instanceof Error ? e.message : "बैठक निर्धारित नहीं हुई।" }; }

  revalidatePath("/portal/meetings");
  return { ok: "बैठक निर्धारित हो गई।" };
}

export async function recordMinutesAction(fd: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(fd.get("meetingId") ?? "");
  const minutes = String(fd.get("minutes") ?? "").trim();
  const attendance = Number(fd.get("attendance") ?? 0);
  // One decision per line — the fastest thing to type straight after a meeting.
  const decisions = String(fd.get("decisions") ?? "").split("\n");
  if (!id || !minutes) return;

  await recordMinutes(actor, id, { minutes, attendance, decisions });
  revalidatePath("/portal/meetings");
}

export async function decisionToTaskAction(fd: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(fd.get("decisionId") ?? "");
  const dueAt = String(fd.get("dueAt") ?? "");
  if (!id) return;

  await decisionToTask(actor, id, { dueAt: dueAt ? new Date(dueAt) : undefined });
  revalidatePath("/portal/meetings");
  revalidatePath("/portal/tasks");
}
