-- CreateEnum
CREATE TYPE "ClientUserRole" AS ENUM ('OWNER', 'HR', 'BILLING');

-- CreateEnum
CREATE TYPE "ClientUserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('ADMIN', 'CLIENT');

-- CreateEnum
CREATE TYPE "JobReviewStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "ActivityLog"
  ADD COLUMN "actorType" TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN "companyId" TEXT,
  ADD COLUMN "metadata" JSONB;

-- AlterTable
ALTER TABLE "JobPost"
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewStatus" "JobReviewStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedByAdminId" TEXT,
  ADD COLUMN "source" "JobSource" NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "submittedByClientId" TEXT;

-- CreateTable
CREATE TABLE "ClientUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "role" "ClientUserRole" NOT NULL DEFAULT 'OWNER',
  "status" "ClientUserStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt" TIMESTAMP(3),
  "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobReviewComment" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "authorType" TEXT NOT NULL,
  "authorEmail" TEXT,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JobReviewComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_email_key" ON "ClientUser"("email");

-- CreateIndex
CREATE INDEX "ClientUser_companyId_idx" ON "ClientUser"("companyId");

-- CreateIndex
CREATE INDEX "ClientUser_status_idx" ON "ClientUser"("status");

-- CreateIndex
CREATE INDEX "JobReviewComment_jobId_createdAt_idx" ON "JobReviewComment"("jobId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_companyId_createdAt_idx" ON "ActivityLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "JobPost_source_reviewStatus_submittedAt_idx" ON "JobPost"("source", "reviewStatus", "submittedAt");

-- CreateIndex
CREATE INDEX "JobPost_submittedByClientId_reviewStatus_idx" ON "JobPost"("submittedByClientId", "reviewStatus");

-- AddForeignKey
ALTER TABLE "ClientUser" ADD CONSTRAINT "ClientUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_submittedByClientId_fkey" FOREIGN KEY ("submittedByClientId") REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPost" ADD CONSTRAINT "JobPost_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobReviewComment" ADD CONSTRAINT "JobReviewComment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
