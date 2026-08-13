-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "options" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "ShopVariant" ADD COLUMN     "option_values" JSONB NOT NULL DEFAULT '{}';
