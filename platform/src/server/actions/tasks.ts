"use server";

/**
 * Server actions for tasks. These are the only write paths the UI can reach,
 * and each one resolves its own actor — a form post carries no authority.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { TaskStatus, Priority } from "@prisma/client";
import { requireActor } from "@/lib/session";
import { createTask, transition } from "@/server/tasks";

const CreateInput = z.object({
  title: z.string().trim().min(4, "कार्य का शीर्षक कम से कम 4 अक्षरों का हो।"),
  description: z.string().trim().optional(),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  dueAt: z.string().optional(),
  cascade: z.boolean().default(false),
});

export type ActionState = { error?: string };

export async function createTaskAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireActor();

  const parsed = CreateInput.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    orgUnitId: formData.get("orgUnitId"),
    priority: formData.get("priority") || undefined,
    dueAt: formData.get("dueAt") || undefined,
    cascade: formData.get("cascade") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };
  }

  const { dueAt, ...rest } = parsed.data;

  try {
    await createTask(actor, {
      ...rest,
      dueAt: dueAt ? new Date(dueAt) : undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "कार्य नहीं बनाया जा सका।" };
  }

  revalidatePath("/portal/tasks");
  redirect("/portal/tasks");
}

export async function transitionAction(formData: FormData): Promise<void> {
  const actor = await requireActor();

  const taskId = String(formData.get("taskId") ?? "");
  const to = String(formData.get("to") ?? "") as TaskStatus;
  const note = String(formData.get("note") ?? "").trim() || undefined;

  if (!taskId || !(to in TaskStatus)) return;

  await transition(actor, taskId, to, note);

  revalidatePath("/portal/tasks");
  revalidatePath(`/portal/tasks/${taskId}`);
}
