-- AlterTable
ALTER TABLE "ShopCollection" ADD COLUMN "parent_id" TEXT,
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ShopCollection_tenant_id_parent_id_sort_order_idx" ON "ShopCollection"("tenant_id", "parent_id", "sort_order");

-- AddForeignKey
ALTER TABLE "ShopCollection" ADD CONSTRAINT "ShopCollection_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "ShopCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
