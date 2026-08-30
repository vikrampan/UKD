-- CreateEnum
CREATE TYPE "work"."ReportStatus" AS ENUM ('PENDING', 'SUBMITTED');

-- CreateTable
CREATE TABLE "work"."ReportPeriod" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "startsOn" TIMESTAMP(3) NOT NULL,
    "endsOn" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."UnitReport" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "status" "work"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "meetings" INTEGER,
    "activities" INTEGER,
    "newMembers" INTEGER,
    "notes" TEXT,

    CONSTRAINT "UnitReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportPeriod_code_key" ON "work"."ReportPeriod"("code");

-- CreateIndex
CREATE INDEX "ReportPeriod_dueAt_idx" ON "work"."ReportPeriod"("dueAt");

-- CreateIndex
CREATE INDEX "UnitReport_orgUnitId_status_idx" ON "work"."UnitReport"("orgUnitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UnitReport_periodId_orgUnitId_key" ON "work"."UnitReport"("periodId", "orgUnitId");

-- AddForeignKey
ALTER TABLE "work"."ReportPeriod" ADD CONSTRAINT "ReportPeriod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."UnitReport" ADD CONSTRAINT "UnitReport_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "work"."ReportPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."UnitReport" ADD CONSTRAINT "UnitReport_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."UnitReport" ADD CONSTRAINT "UnitReport_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

