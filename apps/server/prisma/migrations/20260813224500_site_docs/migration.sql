-- 文档库从 marketing 拆到 site-docs：表改名 + 模板页 kind 改名。
-- 段 type / chrome 块 / 导航源的旧名由解析层别名改写，不在这里扫 jsonb。

ALTER TABLE "MarketingDocCategory" RENAME TO "SiteDocCategory";
ALTER TABLE "MarketingDoc" RENAME TO "SiteDoc";

ALTER INDEX "MarketingDocCategory_pkey" RENAME TO "SiteDocCategory_pkey";
ALTER INDEX "MarketingDocCategory_tenant_id_sort_order_idx" RENAME TO "SiteDocCategory_tenant_id_sort_order_idx";
ALTER INDEX "MarketingDocCategory_tenant_id_key_key" RENAME TO "SiteDocCategory_tenant_id_key_key";

ALTER INDEX "MarketingDoc_pkey" RENAME TO "SiteDoc_pkey";
ALTER INDEX "MarketingDoc_tenant_id_idx" RENAME TO "SiteDoc_tenant_id_idx";
ALTER INDEX "MarketingDoc_tenant_id_status_idx" RENAME TO "SiteDoc_tenant_id_status_idx";
ALTER INDEX "MarketingDoc_tenant_id_category_sort_order_idx" RENAME TO "SiteDoc_tenant_id_category_sort_order_idx";
ALTER INDEX "MarketingDoc_tenant_id_slug_locale_key" RENAME TO "SiteDoc_tenant_id_slug_locale_key";

UPDATE "MarketingPage" SET kind = 'docs_index' WHERE kind = 'doc_index';
UPDATE "MarketingPage" SET kind = 'docs_article' WHERE kind = 'doc_article';

-- 原先用 site.* 管文档库的自定义角色，补上拆出来的 docs.*（内置管理员会在启动时补齐）。
INSERT INTO "RolePermission" ("role_id", "permission")
SELECT rp."role_id", 'docs.read'
FROM "RolePermission" rp
WHERE rp."permission" = 'site.read'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("role_id", "permission")
SELECT rp."role_id", 'docs.write'
FROM "RolePermission" rp
WHERE rp."permission" = 'site.write'
ON CONFLICT DO NOTHING;
