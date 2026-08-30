"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/lib/session";
import { openPeriod, submitReport, weekCode } from "@/server/reports";

export type ReportState = { error?: string; ok?: boolean };

/** Opens the week that just ended, due the following Sunday at 6pm. */
export async function openWeekAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const actor = await requireActor();
  const orgUnitId = String(formData.get("orgUnitId") ?? "");
  if (!orgUnitId) return { error: "इकाई चुनें।" };

  const now = new Date();
  const day = now.getDay() || 7;
  const endsOn = new Date(now);
  endsOn.setDate(now.getDate() - day + 7); // this week's Sunday
  endsOn.setHours(23, 59, 59, 999);

  const startsOn = new Date(endsOn);
  startsOn.setDate(endsOn.getDate() - 6);
  startsOn.setHours(0, 0, 0, 0);

  const dueAt = new Date(endsOn);
  dueAt.setHours(18, 0, 0, 0); // रविवार शाम 6 बजे

  try {
    await openPeriod(actor, { startsOn, endsOn, dueAt, orgUnitId });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "अवधि नहीं खोली जा सकी।" };
  }

  revalidatePath("/portal/reports");
  return { ok: true };
}

const Submit = z.object({
  reportId: z.string().min(1),
  meetings: z.coerce.number().int().min(0, "संख्या 0 या अधिक हो।"),
  activities: z.coerce.number().int().min(0, "संख्या 0 या अधिक हो।"),
  newMembers: z.coerce.number().int().min(0, "संख्या 0 या अधिक हो।"),
  notes: z.string().trim().optional(),
});

export async function submitReportAction(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const actor = await requireActor();

  const parsed = Submit.safeParse({
    reportId: formData.get("reportId"),
    meetings: formData.get("meetings"),
    activities: formData.get("activities"),
    newMembers: formData.get("newMembers"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  const { reportId, ...rest } = parsed.data;
  try {
    await submitReport(actor, reportId, rest);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "रिपोर्ट जमा नहीं हो सकी।" };
  }

  revalidatePath("/portal/reports");
  return { ok: true };
}

export { weekCode };
