-- CreateTable
CREATE TABLE "ContentTemplate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "format" TEXT NOT NULL DEFAULT 'note',
    "fields" JSONB NOT NULL,
    "guidelines" TEXT NOT NULL DEFAULT '',
    "output_rules" JSONB,
    "samples" JSONB,
    "preset_key" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentTemplate_tenant_id_idx" ON "ContentTemplate"("tenant_id");

-- CreateIndex
CREATE INDEX "ContentTemplate_tenant_id_sort_order_idx" ON "ContentTemplate"("tenant_id", "sort_order");

-- AlterTable
ALTER TABLE "Content" ADD COLUMN     "brief_values" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "template_id" TEXT;

-- 存量升级：把自由文本的 brief 搬成「通用创作说明」那一栏的填写记录。
-- 字段 id 与 GENERAL_BRIEF_FIELD_ID 一致，老内容在通用模板下打开时那一栏能对上。
-- brief 列保留，但从此是派生值：写入时由 brief_values 重算，只供列表搜索。
UPDATE "Content"
SET "brief_values" = jsonb_build_array(
      jsonb_build_object('id', 'brief', 'label', '创作说明', 'value', "brief")
    )
WHERE btrim("brief") <> '';
