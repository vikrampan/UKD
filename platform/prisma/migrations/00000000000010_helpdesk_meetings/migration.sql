-- CreateEnum
CREATE TYPE "work"."TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "work"."MeetingStatus" AS ENUM ('SCHEDULED', 'HELD', 'CANCELLED');

-- CreateTable
CREATE TABLE "work"."Ticket" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "department" "identity"."Department" NOT NULL DEFAULT 'IT',
    "priority" "work"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "work"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "raisedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "orgUnitId" TEXT NOT NULL,
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."Meeting" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "heldAt" TIMESTAMP(3) NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "status" "work"."MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "minutes" TEXT,
    "attendance" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."Decision" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ownerId" TEXT,
    "dueAt" TIMESTAMP(3),
    "taskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_code_key" ON "work"."Ticket"("code");

-- CreateIndex
CREATE INDEX "Ticket_orgUnitId_status_idx" ON "work"."Ticket"("orgUnitId", "status");

-- CreateIndex
CREATE INDEX "Ticket_raisedById_idx" ON "work"."Ticket"("raisedById");

-- CreateIndex
CREATE UNIQUE INDEX "Meeting_code_key" ON "work"."Meeting"("code");

-- CreateIndex
CREATE INDEX "Meeting_orgUnitId_heldAt_idx" ON "work"."Meeting"("orgUnitId", "heldAt");

-- CreateIndex
CREATE UNIQUE INDEX "Decision_taskId_key" ON "work"."Decision"("taskId");

-- CreateIndex
CREATE INDEX "Decision_meetingId_idx" ON "work"."Decision"("meetingId");

-- AddForeignKey
ALTER TABLE "work"."Ticket" ADD CONSTRAINT "Ticket_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Ticket" ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Ticket" ADD CONSTRAINT "Ticket_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Meeting" ADD CONSTRAINT "Meeting_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Meeting" ADD CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Decision" ADD CONSTRAINT "Decision_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "work"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Decision" ADD CONSTRAINT "Decision_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS work.ticket_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS work.meeting_code_seq START 1;
