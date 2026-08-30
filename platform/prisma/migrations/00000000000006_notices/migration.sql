-- CreateTable
CREATE TABLE "work"."Notice" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "issuedById" TEXT NOT NULL,
    "orgUnitId" TEXT NOT NULL,
    "department" "identity"."Department" NOT NULL DEFAULT 'ORGANISATION',
    "sensitivity" "identity"."Sensitivity" NOT NULL DEFAULT 'INTERNAL',
    "requiresAck" BOOLEAN NOT NULL DEFAULT true,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work"."NoticeReceipt" (
    "id" TEXT NOT NULL,
    "noticeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "NoticeReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Notice_code_key" ON "work"."Notice"("code");

-- CreateIndex
CREATE INDEX "Notice_orgUnitId_idx" ON "work"."Notice"("orgUnitId");

-- CreateIndex
CREATE INDEX "Notice_createdAt_idx" ON "work"."Notice"("createdAt");

-- CreateIndex
CREATE INDEX "NoticeReceipt_userId_readAt_idx" ON "work"."NoticeReceipt"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NoticeReceipt_noticeId_userId_key" ON "work"."NoticeReceipt"("noticeId", "userId");

-- AddForeignKey
ALTER TABLE "work"."Notice" ADD CONSTRAINT "Notice_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "identity"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."Notice" ADD CONSTRAINT "Notice_orgUnitId_fkey" FOREIGN KEY ("orgUnitId") REFERENCES "org"."OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."NoticeReceipt" ADD CONSTRAINT "NoticeReceipt_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "work"."Notice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work"."NoticeReceipt" ADD CONSTRAINT "NoticeReceipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS work.notice_code_seq START 1;
