CREATE TYPE "AdPlacementStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'ACTIVE', 'PAUSED', 'EXPIRED');

CREATE TABLE "PublicationIssue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issueNumber" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "coverImageUrl" TEXT NOT NULL,
    "targetUrl" TEXT,
    "priceCzk" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationIssue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdPlacement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "clientName" TEXT,
    "creativeUrl" TEXT,
    "targetUrl" TEXT,
    "priceCzk" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "availableSlots" INTEGER NOT NULL DEFAULT 1,
    "status" "AdPlacementStatus" NOT NULL DEFAULT 'AVAILABLE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdPlacement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PublicationIssue_isCurrent_publishedAt_idx" ON "PublicationIssue"("isCurrent", "publishedAt");
CREATE INDEX "AdPlacement_status_startsAt_endsAt_idx" ON "AdPlacement"("status", "startsAt", "endsAt");
CREATE INDEX "AdPlacement_isFeatured_status_idx" ON "AdPlacement"("isFeatured", "status");
