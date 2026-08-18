-- 实体页 `/events/entity/:slug` 需要一个可读且稳定的标识。
--
-- 规则与 NewsEvent.slug 同一套（`slugify(name)-<id 前 6 位>`）：后缀取自 id 而不是随机数，
-- 重跑同一条数据得到同样的 slug。字符类与 JS 侧 `slugifyTitle` 保持一致（保留 CJK）。
--
-- 分三步而不是直接 NOT NULL：表里已经有行（上一条 migration 建的），
-- 直接加非空列会失败。

-- 1. 先加可空列
ALTER TABLE "EventEntity" ADD COLUMN "slug" TEXT;

-- 2. 回填
UPDATE "EventEntity"
SET slug =
  coalesce(
    nullif(
      regexp_replace(
        left(
          regexp_replace(lower(name), '[^a-z0-9一-鿿]+', '-', 'g'),
          60
        ),
        '^-+|-+$', '', 'g'
      ),
      ''
    ),
    'entity'
  )
  || '-' || substring(replace(id, '-', '') FROM 1 FOR 6)
WHERE slug IS NULL;

-- 3. 收紧
ALTER TABLE "EventEntity" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EventEntity_tenant_id_slug_key" ON "EventEntity"("tenant_id", "slug");
