ALTER TABLE "JobPost" ADD COLUMN "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "JobPost_status_showOnHomepage_isTop_renewedAt_idx" ON "JobPost"("status", "showOnHomepage", "isTop", "renewedAt");
