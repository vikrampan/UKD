-- CreateEnum
CREATE TYPE "work"."LedgerKind" AS ENUM ('CONTRIBUTION', 'EXPENSE');

-- CreateEnum
CREATE TYPE "work"."LedgerStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "work"."LedgerEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "work"."LedgerKind" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "description" TEXT NOT NULL,
    "counterparty" TEXT,
    "reference" TEXT,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "department" "identity"."Department" NOT NULL DEFAULT 'FINANCE',
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'CONFIDENTIAL',
    "status" "work"."LedgerStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_code_key" ON "work"."LedgerEntry"("code");

-- CreateIndex
CREATE INDEX "LedgerEntry_orgUnitId_status_idx" ON "work"."LedgerEntry"("orgUnitId", "status");

-- CreateIndex
CREATE INDEX "LedgerEntry_occurredOn_idx" ON "work"."LedgerEntry"("occurredOn");

-- AddForeignKey
ALTER TABLE "work"."LedgerEntry" ADD CONSTRAINT "LedgerEntry_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."LedgerEntry" ADD CONSTRAINT "LedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."LedgerEntry" ADD CONSTRAINT "LedgerEntry_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS work.ledger_code_seq START 1;
