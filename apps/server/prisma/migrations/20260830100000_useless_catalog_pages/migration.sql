-- 按日期绑定改成目录 + 详情：slug 是公开地址，thumbnail 是列表截图；published_on 不再用

-- AlterTable
ALTER TABLE "Thing" ADD COLUMN "slug" TEXT NOT NULL DEFAULT '',
ADD COLUMN "thumbnail" TEXT NOT NULL DEFAULT '';

-- 存量：从名字 / 正文 / id 收成 slug，空格收成连字符
UPDATE "Thing"
SET "slug" = left(
  regexp_replace(
    trim(
      CASE
        WHEN "title" <> '' THEN "title"
        WHEN "text" <> '' THEN left("text", 80)
        ELSE "id"
      END
    ),
    '\s+',
    '-',
    'g'
  ),
  80
)
WHERE "slug" = '';

UPDATE "Thing" SET "slug" = "id" WHERE "slug" = '';

-- 同一租户撞名时加后缀
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "tenant_id", "slug" ORDER BY "created_at", "id"
  ) AS rn
  FROM "Thing"
)
UPDATE "Thing" AS t
SET "slug" = t."slug" || '-' || ranked.rn
FROM ranked
WHERE t."id" = ranked."id" AND ranked.rn > 1;

-- DropIndex
DROP INDEX "Thing_tenant_id_enabled_published_on_idx";
DROP INDEX "Thing_tenant_id_published_on_key";

-- AlterTable
ALTER TABLE "Thing" DROP COLUMN "published_on";

-- CreateIndex
CREATE INDEX "Thing_tenant_id_enabled_idx" ON "Thing"("tenant_id", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "Thing_tenant_id_slug_key" ON "Thing"("tenant_id", "slug");
