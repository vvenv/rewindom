-- CreateTable
CREATE TABLE "MarketingDocCategory" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingDocCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingDocCategory_tenant_id_sort_order_idx" ON "MarketingDocCategory"("tenant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingDocCategory_tenant_id_key_key" ON "MarketingDocCategory"("tenant_id", "key");
