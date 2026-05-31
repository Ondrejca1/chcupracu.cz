ALTER TABLE "AdPlacement" ADD COLUMN "placementKey" TEXT NOT NULL DEFAULT 'homepage_strip';

CREATE INDEX "AdPlacement_placementKey_status_idx" ON "AdPlacement"("placementKey", "status");
