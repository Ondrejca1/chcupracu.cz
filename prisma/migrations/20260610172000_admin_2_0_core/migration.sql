ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'WAITING';
ALTER TYPE "ApplicationStatus" ADD VALUE IF NOT EXISTS 'FORWARDED';

CREATE TYPE "ApplicationTag" AS ENUM ('SUITABLE', 'FORWARDED_TO_COMPANY', 'WAITING', 'POSITION_FILLED');
CREATE TYPE "AdProductType" AS ENUM ('PAID_AD', 'JALOVEC', 'PARTNER_OF_WEEK');

ALTER TABLE "Application" ADD COLUMN "tags" "ApplicationTag"[] NOT NULL DEFAULT ARRAY[]::"ApplicationTag"[];
ALTER TABLE "AdPlacement" ADD COLUMN "productType" "AdProductType" NOT NULL DEFAULT 'PAID_AD';

CREATE TABLE "ApplicationCommunication" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "actorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationCommunication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ApplicationCommunication_applicationId_createdAt_idx" ON "ApplicationCommunication"("applicationId", "createdAt");

ALTER TABLE "ApplicationCommunication" ADD CONSTRAINT "ApplicationCommunication_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AdPlacement_productType_status_idx" ON "AdPlacement"("productType", "status");
