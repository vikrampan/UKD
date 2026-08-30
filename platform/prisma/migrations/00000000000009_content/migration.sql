-- CreateEnum
CREATE TYPE "work"."EventStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "work"."Event" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "orgUnitId" TEXT NOT NULL,
    "status" "work"."EventStatus" NOT NULL DEFAULT 'PLANNED',
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "attendance" INTEGER,
    "outcome" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."Document" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "url" TEXT,
    "notes" TEXT,
    "orgUnitId" TEXT NOT NULL,
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."Announcement" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "orgUnitId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_code_key" ON "work"."Event"("code");

-- CreateIndex
CREATE INDEX "Event_orgUnitId_startsAt_idx" ON "work"."Event"("orgUnitId", "startsAt");

-- CreateIndex
CREATE INDEX "Event_isPublic_startsAt_idx" ON "work"."Event"("isPublic", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Document_code_key" ON "work"."Document"("code");

-- CreateIndex
CREATE INDEX "Document_orgUnitId_idx" ON "work"."Document"("orgUnitId");

-- CreateIndex
CREATE INDEX "Document_isPublic_createdAt_idx" ON "work"."Document"("isPublic", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Announcement_slug_key" ON "work"."Announcement"("slug");

-- CreateIndex
CREATE INDEX "Announcement_isPublished_publishedAt_idx" ON "work"."Announcement"("isPublished", "publishedAt");

-- AddForeignKey
ALTER TABLE "work"."Event" ADD CONSTRAINT "Event_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Document" ADD CONSTRAINT "Document_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Announcement" ADD CONSTRAINT "Announcement_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS work.event_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS work.document_code_seq START 1;
