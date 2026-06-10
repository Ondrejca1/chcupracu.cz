CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'EDITOR', 'SALES', 'VIEWER');
CREATE TYPE "AdminUserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

ALTER TABLE "AdminUser" ADD COLUMN "username" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "firstName" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "lastName" TEXT;
ALTER TABLE "AdminUser" ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'ADMIN';
ALTER TABLE "AdminUser" ADD COLUMN "status" "AdminUserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "AdminUser" ADD COLUMN "forcePasswordChange" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdminUser" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "AdminUser" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AdminUser" ADD COLUMN "lockedUntil" TIMESTAMP(3);

WITH normalized_users AS (
  SELECT
    "id",
    lower(split_part("email", '@', 1)) AS base_username,
    row_number() OVER (PARTITION BY lower(split_part("email", '@', 1)) ORDER BY "createdAt", "id") AS duplicate_index,
    count(*) OVER (PARTITION BY lower(split_part("email", '@', 1))) AS duplicate_count
  FROM "AdminUser"
)
UPDATE "AdminUser" admin_user
SET
  "username" = COALESCE(
    admin_user."username",
    CASE
      WHEN normalized_users.duplicate_count > 1 THEN normalized_users.base_username || '-' || normalized_users.duplicate_index
      ELSE normalized_users.base_username
    END
  ),
  "firstName" = COALESCE(admin_user."firstName", admin_user."name"),
  "role" = 'ADMIN',
  "status" = 'ACTIVE'
FROM normalized_users
WHERE admin_user."id" = normalized_users."id" AND (admin_user."username" IS NULL OR admin_user."firstName" IS NULL);

CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
