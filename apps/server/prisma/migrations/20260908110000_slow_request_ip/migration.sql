-- AlterTable
ALTER TABLE "SlowRequestLog" ADD COLUMN     "ip_address" TEXT;

-- CreateIndex
CREATE INDEX "SlowRequestLog_ip_address_idx" ON "SlowRequestLog"("ip_address");

