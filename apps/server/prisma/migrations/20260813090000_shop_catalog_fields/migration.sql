-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "subtitle" JSONB,
ADD COLUMN     "images" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "product_type" TEXT,
ADD COLUMN     "vendor" TEXT,
ADD COLUMN     "tags" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "seo_title" JSONB,
ADD COLUMN     "seo_description" JSONB,
ADD COLUMN     "published_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ShopVariant" ADD COLUMN     "compare_at_price_cents" INTEGER,
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "inventory_policy" TEXT NOT NULL DEFAULT 'deny',
ADD COLUMN     "track_inventory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requires_shipping" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "taxable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ShopOrder" ADD COLUMN     "note" TEXT;
