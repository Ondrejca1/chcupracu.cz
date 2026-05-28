-- AlterTable
ALTER TABLE "Company" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandColor" TEXT;

-- AlterTable
ALTER TABLE "JobPost" ADD COLUMN "previewImageUrl" TEXT;
ALTER TABLE "JobPost" ADD COLUMN "detailImageUrl" TEXT;
ALTER TABLE "JobPost" ADD COLUMN "flyerUrl" TEXT;
ALTER TABLE "JobPost" ADD COLUMN "showImageInList" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "JobPost" ADD COLUMN "showSalaryInPreview" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "JobPost_status_isTop_renewedAt_idx" ON "JobPost"("status", "isTop", "renewedAt");

-- CreateIndex
CREATE INDEX "JobPost_status_createdAt_idx" ON "JobPost"("status", "createdAt");

-- CreateIndex
CREATE INDEX "JobPost_companyId_status_idx" ON "JobPost"("companyId", "status");
