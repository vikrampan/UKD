"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActor } from "@/lib/session";
import { createEvent, completeEvent, addDocument, writeAnnouncement, setPublished } from "@/server/content";

export type ContentState = { error?: string; ok?: string };

const EventInput = z.object({
  title: z.string().trim().min(4, "कार्यक्रम का शीर्षक लिखें।"),
  description: z.string().trim().min(10, "विवरण लिखें।"),
  kind: z.string().trim().min(2, "प्रकार लिखें।"),
  venue: z.string().trim().min(2, "स्थान लिखें।"),
  startsAt: z.string().min(1, "दिनांक चुनें।"),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
  isPublic: z.boolean().default(false),
});

export async function createEventAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const actor = await requireActor();
  const parsed = EventInput.safeParse({
    title: fd.get("title"), description: fd.get("description"), kind: fd.get("kind"),
    venue: fd.get("venue"), startsAt: fd.get("startsAt"), orgUnitId: fd.get("orgUnitId"),
    isPublic: fd.get("isPublic") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  try {
    await createEvent(actor, { ...parsed.data, startsAt: new Date(parsed.data.startsAt) });
  } catch (e) { return { error: e instanceof Error ? e.message : "कार्यक्रम नहीं बना।" }; }

  revalidatePath("/portal/content");
  return { ok: "कार्यक्रम जोड़ दिया गया।" };
}

export async function completeEventAction(fd: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(fd.get("eventId") ?? "");
  const attendance = Number(fd.get("attendance") ?? 0);
  const outcome = String(fd.get("outcome") ?? "").trim();
  if (!id || !outcome) return;

  await completeEvent(actor, id, { attendance, outcome });
  revalidatePath("/portal/content");
}

const DocInput = z.object({
  title: z.string().trim().min(4, "दस्तावेज़ का शीर्षक लिखें।"),
  category: z.string().trim().min(2, "श्रेणी लिखें।"),
  url: z.string().trim().url("मान्य लिंक दें।").optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
  isPublic: z.boolean().default(false),
});

export async function addDocumentAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const actor = await requireActor();
  const parsed = DocInput.safeParse({
    title: fd.get("title"), category: fd.get("category"), url: fd.get("url") || "",
    notes: fd.get("notes") || undefined, orgUnitId: fd.get("orgUnitId"),
    isPublic: fd.get("isPublic") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  try {
    await addDocument(actor, { ...parsed.data, url: parsed.data.url || undefined });
  } catch (e) { return { error: e instanceof Error ? e.message : "दस्तावेज़ नहीं जुड़ा।" }; }

  revalidatePath("/portal/content");
  return { ok: "दस्तावेज़ जोड़ दिया गया।" };
}

const PostInput = z.object({
  title: z.string().trim().min(6, "शीर्षक लिखें।"),
  excerpt: z.string().trim().min(10, "संक्षिप्त विवरण लिखें।"),
  body: z.string().trim().min(30, "पूरा लेख लिखें।"),
  tag: z.string().trim().min(2, "श्रेणी लिखें।"),
  orgUnitId: z.string().min(1, "इकाई चुनें।"),
  publish: z.boolean().default(false),
});

export async function writeAnnouncementAction(_p: ContentState, fd: FormData): Promise<ContentState> {
  const actor = await requireActor();
  const parsed = PostInput.safeParse({
    title: fd.get("title"), excerpt: fd.get("excerpt"), body: fd.get("body"),
    tag: fd.get("tag"), orgUnitId: fd.get("orgUnitId"), publish: fd.get("publish") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "अमान्य जानकारी।" };

  try { await writeAnnouncement(actor, parsed.data); }
  catch (e) { return { error: e instanceof Error ? e.message : "सूचना नहीं बनी।" }; }

  revalidatePath("/portal/content");
  return { ok: parsed.data.publish ? "प्रकाशित कर दिया गया।" : "प्रारूप सुरक्षित।" };
}

export async function togglePublishAction(fd: FormData): Promise<void> {
  const actor = await requireActor();
  const id = String(fd.get("postId") ?? "");
  const publish = fd.get("publish") === "true";
  if (!id) return;

  await setPublished(actor, id, publish);
  revalidatePath("/portal/content");
}
