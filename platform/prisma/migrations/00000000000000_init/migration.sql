-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "identity";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "org";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "work";

-- CreateEnum
CREATE TYPE "org"."OrgUnitType" AS ENUM ('PARTY', 'STATE', 'REGION', 'DISTRICT', 'ASSEMBLY', 'BLOCK', 'LOCAL_UNIT', 'BOOTH');

-- CreateEnum
CREATE TYPE "identity"."RoleKey" AS ENUM ('SUPER_ADMIN', 'TOP_LEADERSHIP', 'CENTRAL_ADMIN', 'STATE_ADMIN', 'DISTRICT_ADMIN', 'BLOCK_COORDINATOR', 'UNIT_COORDINATOR', 'KARYAKARTA', 'IT_CELL', 'ERP_CELL', 'COMMS_CELL');

-- CreateEnum
CREATE TYPE "identity"."Department" AS ENUM ('ORGANISATION', 'IT', 'ERP', 'COMMUNICATIONS', 'FINANCE', 'TRAINING', 'ADMIN');

-- CreateEnum
CREATE TYPE "identity"."Sensitivity" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "identity"."UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "work"."TaskStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CLOSED', 'REJECTED', 'CORRECTION_REQUIRED', 'RESUBMITTED');

-- CreateEnum
CREATE TYPE "work"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "work"."IssueStatus" AS ENUM ('RECEIVED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "identity"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" "identity"."UserStatus" NOT NULL DEFAULT 'INVITED',
    "mfaSecret" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."Grant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "identity"."RoleKey" NOT NULL,
    "department" "identity"."Department" NOT NULL DEFAULT 'ORGANISATION',
    "orgUnitId" TEXT,
    "maxSensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org"."OrgUnit" (
    "id" TEXT NOT NULL,
    "type" "org"."OrgUnitType" NOT NULL,
    "name" TEXT NOT NULL,
    "nameHi" TEXT,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org"."Karyakarta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "responsibilities" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Karyakarta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."Task" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "ownerId" TEXT,
    "orgUnitId" TEXT NOT NULL,
    "department" "identity"."Department" NOT NULL DEFAULT 'ORGANISATION',
    "parentId" TEXT,
    "status" "work"."TaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "priority" "work"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."TaskEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "from" "work"."TaskStatus",
    "to" "work"."TaskStatus" NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."Issue" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "citizenName" TEXT NOT NULL,
    "citizenPhone" TEXT NOT NULL,
    "locality" TEXT,
    "orgUnitId" TEXT NOT NULL,
    "status" "work"."IssueStatus" NOT NULL DEFAULT 'RECEIVED',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit"."AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "identity"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "identity"."User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "identity"."User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "identity"."Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "identity"."Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Grant_userId_idx" ON "identity"."Grant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Grant_userId_role_department_orgUnitId_key" ON "identity"."Grant"("userId", "role", "department", "orgUnitId");

-- CreateIndex
CREATE INDEX "OrgUnit_path_idx" ON "org"."OrgUnit"("path");

-- CreateIndex
CREATE INDEX "OrgUnit_parentId_idx" ON "org"."OrgUnit"("parentId");

-- CreateIndex
CREATE INDEX "OrgUnit_type_idx" ON "org"."OrgUnit"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Karyakarta_userId_key" ON "org"."Karyakarta"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Karyakarta_code_key" ON "org"."Karyakarta"("code");

-- CreateIndex
CREATE INDEX "Karyakarta_orgUnitId_idx" ON "org"."Karyakarta"("orgUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_code_key" ON "work"."Task"("code");

-- CreateIndex
CREATE INDEX "Task_orgUnitId_status_idx" ON "work"."Task"("orgUnitId", "status");

-- CreateIndex
CREATE INDEX "Task_ownerId_status_idx" ON "work"."Task"("ownerId", "status");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "work"."Task"("parentId");

-- CreateIndex
CREATE INDEX "Task_dueAt_idx" ON "work"."Task"("dueAt");

-- CreateIndex
CREATE INDEX "TaskEvent_taskId_at_idx" ON "work"."TaskEvent"("taskId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_code_key" ON "work"."Issue"("code");

-- CreateIndex
CREATE INDEX "Issue_orgUnitId_status_idx" ON "work"."Issue"("orgUnitId", "status");

-- CreateIndex
CREATE INDEX "Issue_code_idx" ON "work"."Issue"("code");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "audit"."AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_at_idx" ON "audit"."AuditLog"("actorId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "audit"."AuditLog"("at");

-- AddForeignKey
ALTER TABLE "identity"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."Grant" ADD CONSTRAINT "Grant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."Grant" ADD CONSTRAINT "Grant_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org"."OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "org"."OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org"."Karyakarta" ADD CONSTRAINT "Karyakarta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org"."Karyakarta" ADD CONSTRAINT "Karyakarta_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Task" ADD CONSTRAINT "Task_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "work"."Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "work"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."TaskEvent" ADD CONSTRAINT "TaskEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Issue" ADD CONSTRAINT "Issue_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit"."AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "identity"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

