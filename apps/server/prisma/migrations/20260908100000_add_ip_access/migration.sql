-- CreateTable
CREATE TABLE "IpAccessRule" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT,
    "cidr" TEXT NOT NULL,
    "ip_version" INTEGER NOT NULL,
    "action" TEXT NOT NULL DEFAULT 'block',
    "mode" TEXT NOT NULL DEFAULT 'log_only',
    "reason" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "created_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_hit_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IpAccessRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IpAccessRule_tenant_id_action_idx" ON "IpAccessRule"("tenant_id", "action");

-- CreateIndex
CREATE INDEX "IpAccessRule_expires_at_idx" ON "IpAccessRule"("expires_at");

-- CreateIndex
CREATE INDEX "IpAccessRule_source_idx" ON "IpAccessRule"("source");

-- CreateIndex
CREATE UNIQUE INDEX "IpAccessRule_tenant_id_cidr_key" ON "IpAccessRule"("tenant_id", "cidr");

