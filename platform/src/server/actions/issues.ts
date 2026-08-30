"use server";

import { revalidatePath } from "next/cache";
import { IssueStatus } from "@prisma/client";
import { requireActor } from "@/lib/session";
import { advanceIssue } from "@/server/issues";

export async function advanceIssueAction(formData: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(formData.get("issueId") ?? "");
  const to = String(formData.get("to") ?? "") as IssueStatus;
  if (!id || !(to in IssueStatus)) return;

  await advanceIssue(actor, id, to);
  revalidatePath("/portal/issues");
}
