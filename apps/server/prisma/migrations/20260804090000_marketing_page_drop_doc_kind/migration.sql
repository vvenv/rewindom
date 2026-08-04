-- 去掉 MarketingPage.kind = 'doc'：文档站用普通 page + 多段 slug。
-- index → docs；其余 doc slug → docs/{slug}。已有同路径 page 时跳过，避免撞 @@unique。

UPDATE "MarketingPage" AS doc
SET
  kind = 'page',
  slug = 'docs'
WHERE doc.kind = 'doc'
  AND doc.slug = 'index'
  AND NOT EXISTS (
    SELECT 1
    FROM "MarketingPage" AS existing
    WHERE existing.tenant_id = doc.tenant_id
      AND existing.locale = doc.locale
      AND existing.slug = 'docs'
      AND existing.id <> doc.id
  );

UPDATE "MarketingPage" AS doc
SET
  kind = 'page',
  slug = 'docs/' || doc.slug
WHERE doc.kind = 'doc'
  AND doc.slug <> 'index'
  AND NOT EXISTS (
    SELECT 1
    FROM "MarketingPage" AS existing
    WHERE existing.tenant_id = doc.tenant_id
      AND existing.locale = doc.locale
      AND existing.slug = 'docs/' || doc.slug
      AND existing.id <> doc.id
  );

-- 仍撞唯一约束的残留 doc 行：至少改掉 kind，slug 留给运维手工处理
UPDATE "MarketingPage"
SET kind = 'page'
WHERE kind = 'doc';
