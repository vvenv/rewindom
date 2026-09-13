-- AlterTable
ALTER TABLE "User" ADD COLUMN "totp_secret_encrypted" TEXT,
ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totp_recovery_codes" JSONB;

-- AlterTable
ALTER TABLE "PlatformAdmin" ADD COLUMN "totp_secret_encrypted" TEXT,
ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "totp_recovery_codes" JSONB;
