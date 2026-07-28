-- CreateTable
CREATE TABLE "Todo" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Todo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Todo_tenant_id_idx" ON "Todo"("tenant_id");

-- CreateIndex
CREATE INDEX "Todo_tenant_id_completed_updated_at_idx" ON "Todo"("tenant_id", "completed", "updated_at");
