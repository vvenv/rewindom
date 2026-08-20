-- 与 backfill-page-meta-presets.ts 同一张表：库存标题 / 描述写回当前预设。
-- 生产 app 镜像没有 pnpm/tsx，在 postgres 容器里跑：
--   docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
--     psql -U rewindom -d rewindom -v ON_ERROR_STOP=1 \
--     -f /dev/stdin < apps/server/scripts/backfill-page-meta-presets.sql
--
-- 只改仍是官方默认值的字段；租户改过的句子 CASE 落到 ELSE 原样留下。

BEGIN;

WITH expected (kind, locale, title, description) AS (
  VALUES
    ('events_detail', 'en', '{event}', '{headline}'),
    ('events_detail', 'zh-CN', '{event}', '{headline}'),
    ('events_entity', 'en', '{entity}', 'Every event involving {entity}'),
    ('events_entity', 'zh-CN', '{entity}', '与 {entity} 相关的全部事件'),
    ('events_topic', 'en', '{topic}', 'What''s happening in {topic}, merged across sources'),
    ('events_topic', 'zh-CN', '{topic}', '跨来源追踪 {topic} 正在发生的事'),
    ('shop_product', 'en', '{product}', '{product_description}'),
    ('shop_product', 'zh-CN', '{product}', '{product_description}'),
    ('shop_collection', 'en', '{collection}', '{collection_description}'),
    ('shop_collection', 'zh-CN', '{collection}', '{collection_description}'),
    ('shop_order', 'en', '{order}', 'Status and tracking'),
    ('shop_order', 'zh-CN', '{order}', '订单状态与物流'),
    ('docs_article', 'en', '{doc}', '{doc_description}'),
    ('docs_article', 'zh-CN', '{doc}', '{doc_description}')
),
stock_title (kind, value) AS (
  VALUES
    ('events_detail', ''),
    ('events_detail', 'events:site.detail.title'),
    ('events_detail', 'Event'),
    ('events_detail', '事件详情'),
    ('events_detail', '{event}'),
    ('events_entity', ''),
    ('events_entity', 'events:site.entity.title'),
    ('events_entity', 'Entity'),
    ('events_entity', '实体'),
    ('events_entity', '{entity}'),
    ('events_topic', ''),
    ('events_topic', 'events:site.topic.title'),
    ('events_topic', '{topic}'),
    ('shop_product', ''),
    ('shop_product', 'shop:storefront.product.title'),
    ('shop_product', 'Product'),
    ('shop_product', '商品'),
    ('shop_product', '{product}'),
    ('shop_collection', ''),
    ('shop_collection', 'shop:storefront.collection.title'),
    ('shop_collection', 'Collection'),
    ('shop_collection', '分类'),
    ('shop_collection', '{collection}'),
    ('shop_order', ''),
    ('shop_order', 'shop:storefront.order.pageTitle'),
    ('shop_order', 'Order'),
    ('shop_order', '订单'),
    ('shop_order', '{order}'),
    ('docs_article', ''),
    ('docs_article', 'site-docs:template.article.title'),
    ('docs_article', 'Doc detail'),
    ('docs_article', '文档详情'),
    ('docs_article', '{doc}')
),
stock_description (kind, value) AS (
  VALUES
    ('events_detail', ''),
    ('events_detail', 'events:site.detail.subtitle'),
    ('events_detail', 'What happened, how it developed, and the evidence'),
    ('events_detail', '发生了什么、怎么发展到现在、证据在哪'),
    ('events_detail', '{headline}'),
    ('events_entity', ''),
    ('events_entity', 'events:site.entity.subtitle'),
    ('events_entity', 'Every event involving this company, product or person'),
    ('events_entity', '这个公司 / 产品 / 人物涉及的全部事件'),
    ('events_entity', 'Every event involving {entity}'),
    ('events_entity', '与 {entity} 相关的全部事件'),
    ('events_topic', ''),
    ('events_topic', 'events:site.topic.subtitle'),
    ('events_topic', 'What''s happening in {topic}, merged across sources'),
    ('events_topic', '跨来源追踪 {topic} 正在发生的事'),
    ('shop_product', ''),
    ('shop_product', 'shop:storefront.product.subtitle'),
    ('shop_product', 'Product details'),
    ('shop_product', '商品详情'),
    ('shop_product', '{product_description}'),
    ('shop_collection', ''),
    ('shop_collection', 'shop:storefront.collection.subtitle'),
    ('shop_collection', 'Products in this collection'),
    ('shop_collection', '该分类下的商品'),
    ('shop_collection', '{collection_description}'),
    ('shop_order', ''),
    ('shop_order', 'shop:storefront.order.subtitle'),
    ('shop_order', 'Status and tracking'),
    ('shop_order', '订单状态与物流'),
    ('docs_article', ''),
    ('docs_article', 'site-docs:template.article.description'),
    ('docs_article', 'Layout for a single document (shared by every /docs/… address).'),
    ('docs_article', '单篇文档的版式（所有 /docs/… 地址共用）。'),
    ('docs_article', '{doc_description}')
)
UPDATE "MarketingPage" AS p
SET
  title = CASE
    WHEN EXISTS (
      SELECT 1 FROM stock_title s
      WHERE s.kind = p.kind AND s.value = btrim(p.title)
    ) THEN e.title
    ELSE p.title
  END,
  title_draft = CASE
    WHEN EXISTS (
      SELECT 1 FROM stock_title s
      WHERE s.kind = p.kind AND s.value = btrim(p.title_draft)
    ) THEN e.title
    ELSE p.title_draft
  END,
  description = CASE
    WHEN EXISTS (
      SELECT 1 FROM stock_description s
      WHERE s.kind = p.kind AND s.value = btrim(p.description)
    ) THEN e.description
    ELSE p.description
  END,
  description_draft = CASE
    WHEN EXISTS (
      SELECT 1 FROM stock_description s
      WHERE s.kind = p.kind AND s.value = btrim(p.description_draft)
    ) THEN e.description
    ELSE p.description_draft
  END,
  updated_at = NOW()
FROM expected e
WHERE e.kind = p.kind
  AND e.locale = p.locale
  AND (
    (
      EXISTS (
        SELECT 1 FROM stock_title s
        WHERE s.kind = p.kind AND s.value = btrim(p.title)
      )
      AND p.title IS DISTINCT FROM e.title
    )
    OR (
      EXISTS (
        SELECT 1 FROM stock_title s
        WHERE s.kind = p.kind AND s.value = btrim(p.title_draft)
      )
      AND p.title_draft IS DISTINCT FROM e.title
    )
    OR (
      EXISTS (
        SELECT 1 FROM stock_description s
        WHERE s.kind = p.kind AND s.value = btrim(p.description)
      )
      AND p.description IS DISTINCT FROM e.description
    )
    OR (
      EXISTS (
        SELECT 1 FROM stock_description s
        WHERE s.kind = p.kind AND s.value = btrim(p.description_draft)
      )
      AND p.description_draft IS DISTINCT FROM e.description
    )
  );

SELECT kind, locale, title, title_draft, description, description_draft
FROM "MarketingPage"
WHERE kind IN (
  'events_detail',
  'events_entity',
  'events_topic',
  'shop_product',
  'shop_collection',
  'shop_order',
  'docs_article'
)
ORDER BY kind, locale;

COMMIT;
