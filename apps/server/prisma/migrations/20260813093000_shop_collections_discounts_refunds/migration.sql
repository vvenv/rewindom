-- CreateTable
CREATE TABLE "ShopCollection" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "title" JSONB NOT NULL,
    "description" JSONB,
    "seo_title" JSONB,
    "seo_description" JSONB,
    "image_url" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopCollectionProduct" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopCollectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopDiscount" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "min_subtotal_cents" INTEGER NOT NULL DEFAULT 0,
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopDiscount_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ShopCart" ADD COLUMN "discount_code" TEXT;

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN "discount_code" TEXT,
ADD COLUMN "discount_cents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "ShopCollection_tenant_id_slug_key" ON "ShopCollection"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "ShopCollection_tenant_id_status_updated_at_idx" ON "ShopCollection"("tenant_id", "status", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "ShopCollectionProduct_tenant_id_collection_id_product_id_key" ON "ShopCollectionProduct"("tenant_id", "collection_id", "product_id");

-- CreateIndex
CREATE INDEX "ShopCollectionProduct_tenant_id_collection_id_position_idx" ON "ShopCollectionProduct"("tenant_id", "collection_id", "position");

-- CreateIndex
CREATE INDEX "ShopCollectionProduct_tenant_id_product_id_idx" ON "ShopCollectionProduct"("tenant_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "ShopDiscount_tenant_id_code_key" ON "ShopDiscount"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "ShopDiscount_tenant_id_status_updated_at_idx" ON "ShopDiscount"("tenant_id", "status", "updated_at");

-- AddForeignKey
ALTER TABLE "ShopCollectionProduct" ADD CONSTRAINT "ShopCollectionProduct_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "ShopCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopCollectionProduct" ADD CONSTRAINT "ShopCollectionProduct_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
