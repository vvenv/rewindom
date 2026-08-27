-- CreateTable
CREATE TABLE "Thing" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Thing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Thing_tenant_id_idx" ON "Thing"("tenant_id");

-- CreateIndex
CREATE INDEX "Thing_tenant_id_enabled_updated_at_idx" ON "Thing"("tenant_id", "enabled", "updated_at");
