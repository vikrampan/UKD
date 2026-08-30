/**
 * Events, documents and announcements.
 *
 * Each has two audiences: the organisation, scoped as usual, and the public
 * site, which sees only what has been explicitly marked public. Publishing is
 * always an opt-in act — nothing reaches the public site by default.
 */
import { EventStatus, Sensitivity } from "@prisma/client";
import { db } from "@/lib/db";
import { recordIn } from "@/lib/audit";
import { canActOn, scope, type Actor } from "@/lib/rbac";
import { Forbidden } from "@/server/tasks";

export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  PLANNED: "निर्धारित",
  COMPLETED: "सम्पन्न",
  CANCELLED: "रद्द",
};

/* ─────────────────── events ─────────────────── */

export function listEvents(actor: Actor) {
  const { where } = scope(actor);
  return db.event.findMany({
    where,
    include: { orgUnit: true, createdBy: true },
    orderBy: { startsAt: "desc" },
  });
}

export async function createEvent(
  actor: Actor,
  input: {
    title: string; description: string; kind: string; venue: string;
    startsAt: Date; endsAt?: Date; orgUnitId: string; isPublic: boolean;
  },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('work.event_code_seq')
    `;
    const event = await tx.event.create({
      data: {
        code: `UKD-E-${new Date().getFullYear()}-${String(nextval).padStart(4, "0")}`,
        title: input.title,
        description: input.description,
        kind: input.kind,
        venue: input.venue,
        startsAt: input.startsAt,
        endsAt: input.endsAt ?? null,
        orgUnitId: unit.id,
        isPublic: input.isPublic,
        // Anything shown publicly is by definition not confidential.
        sensitivity: input.isPublic ? Sensitivity.PUBLIC : Sensitivity.INTERNAL,
        createdById: actor.userId,
      },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "event.create", entity: "Event", entityId: event.id,
      after: { code: event.code, isPublic: event.isPublic, orgUnitId: unit.id },
    });
    return event;
  });
}

/** Close an event out with what actually happened. */
export async function completeEvent(
  actor: Actor,
  eventId: string,
  input: { attendance: number; outcome: string },
) {
  const { where } = scope(actor);
  const event = await db.event.findFirst({ where: { ...where, id: eventId }, include: { orgUnit: true } });
  if (!event) throw new Forbidden();
  if (!canActOn(actor, event.orgUnit.path)) throw new Forbidden();
  if (event.status !== EventStatus.PLANNED) throw new Forbidden("इस कार्यक्रम पर पहले ही निर्णय हो चुका है।");

  return db.$transaction(async (tx) => {
    const updated = await tx.event.update({
      where: { id: event.id },
      data: { status: EventStatus.COMPLETED, attendance: input.attendance, outcome: input.outcome },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "event.complete", entity: "Event", entityId: event.id,
      after: { attendance: input.attendance },
    });
    return updated;
  });
}

/* ─────────────────── documents ─────────────────── */

export function listDocuments(actor: Actor) {
  const { where } = scope(actor);
  return db.document.findMany({
    where,
    include: { orgUnit: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function addDocument(
  actor: Actor,
  input: {
    title: string; category: string; url?: string; notes?: string;
    orgUnitId: string; isPublic: boolean; sensitivity?: Sensitivity;
  },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`
      SELECT nextval('work.document_code_seq')
    `;
    const doc = await tx.document.create({
      data: {
        code: `UKD-D-${new Date().getFullYear()}-${String(nextval).padStart(4, "0")}`,
        title: input.title,
        category: input.category,
        url: input.url ?? null,
        notes: input.notes ?? null,
        orgUnitId: unit.id,
        isPublic: input.isPublic,
        sensitivity: input.isPublic ? Sensitivity.PUBLIC : (input.sensitivity ?? Sensitivity.INTERNAL),
        uploadedById: actor.userId,
      },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "document.add", entity: "Document", entityId: doc.id,
      after: { code: doc.code, isPublic: doc.isPublic },
    });
    return doc;
  });
}

/* ─────────────────── announcements ─────────────────── */

export function listAnnouncements(actor: Actor) {
  const { where } = scope(actor);
  return db.announcement.findMany({
    where,
    include: { orgUnit: true, author: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
}

function slugify(title: string): string {
  // Devanagari survives encodeURIComponent, so keep the words themselves and
  // only strip punctuation. \p{M} is essential: matras and the nukta are
  // Unicode Marks, not Letters, so a Letters-only filter silently mangles
  // पर्वतीय into परवतय.
  return title.trim().toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function writeAnnouncement(
  actor: Actor,
  input: { title: string; excerpt: string; body: string; tag: string; orgUnitId: string; publish: boolean },
) {
  const unit = await db.orgUnit.findUniqueOrThrow({ where: { id: input.orgUnitId } });
  if (!canActOn(actor, unit.path)) throw new Forbidden();

  const base = slugify(input.title);
  const clash = await db.announcement.count({ where: { slug: { startsWith: base } } });
  const slug = clash === 0 ? base : `${base}-${clash + 1}`;

  return db.$transaction(async (tx) => {
    const post = await tx.announcement.create({
      data: {
        slug,
        title: input.title,
        excerpt: input.excerpt,
        body: input.body,
        tag: input.tag,
        orgUnitId: unit.id,
        authorId: actor.userId,
        isPublished: input.publish,
        publishedAt: input.publish ? new Date() : null,
      },
    });
    await recordIn(tx, {
      actorId: actor.userId, action: "announcement.write", entity: "Announcement", entityId: post.id,
      after: { slug, published: input.publish },
    });
    return post;
  });
}

export async function setPublished(actor: Actor, id: string, publish: boolean) {
  const { where } = scope(actor);
  const post = await db.announcement.findFirst({ where: { ...where, id } });
  if (!post) throw new Forbidden();

  return db.$transaction(async (tx) => {
    const updated = await tx.announcement.update({
      where: { id },
      data: { isPublished: publish, publishedAt: publish ? (post.publishedAt ?? new Date()) : null },
    });
    await recordIn(tx, {
      actorId: actor.userId,
      action: publish ? "announcement.publish" : "announcement.unpublish",
      entity: "Announcement", entityId: id,
    });
    return updated;
  });
}

/* ─────────────────── public reads (no actor) ─────────────────── */

export function publicAnnouncements(limit = 20) {
  return db.announcement.findMany({
    where: { isPublished: true },
    select: { slug: true, title: true, excerpt: true, tag: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
  });
}

export function publicAnnouncement(slug: string) {
  return db.announcement.findFirst({
    where: { slug, isPublished: true },
    select: { slug: true, title: true, excerpt: true, body: true, tag: true, publishedAt: true },
  });
}

export function publicEvents(limit = 30) {
  return db.event.findMany({
    where: { isPublic: true, status: { not: EventStatus.CANCELLED } },
    select: {
      code: true, title: true, description: true, kind: true, venue: true,
      startsAt: true, status: true, orgUnit: { select: { name: true } },
    },
    orderBy: { startsAt: "desc" },
    take: limit,
  });
}

export function publicDocuments(limit = 50) {
  return db.document.findMany({
    where: { isPublic: true },
    select: {
      code: true, title: true, category: true, url: true, createdAt: true,
      orgUnit: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
