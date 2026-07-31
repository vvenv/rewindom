-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN "detail_key" TEXT,
ADD COLUMN "detail_params" JSONB;

-- CreateIndex
CREATE INDEX "AuditLog_detail_key_idx" ON "AuditLog"("detail_key");
