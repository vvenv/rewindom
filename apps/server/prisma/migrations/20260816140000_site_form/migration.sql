-- 表单从 marketing 拆到 site-form：表改名 + 权限拆分。
-- 段 type（`form` → `site-form.form`）由解析层别名改写，不在这里扫 jsonb。

ALTER TABLE "MarketingFormSubmission" RENAME TO "SiteFormSubmission";

ALTER INDEX "MarketingFormSubmission_pkey" RENAME TO "SiteFormSubmission_pkey";
ALTER INDEX "MarketingFormSubmission_tenant_id_created_at_idx" RENAME TO "SiteFormSubmission_tenant_id_created_at_idx";
ALTER INDEX "MarketingFormSubmission_tenant_id_section_id_idx" RENAME TO "SiteFormSubmission_tenant_id_section_id_idx";

-- 原先用 site.* 看表单提交的自定义角色，补上拆出来的 form.*（内置管理员会在启动时补齐）。
INSERT INTO "RolePermission" ("role_id", "permission")
SELECT rp."role_id", 'form.read'
FROM "RolePermission" rp
WHERE rp."permission" = 'site.read'
ON CONFLICT DO NOTHING;

INSERT INTO "RolePermission" ("role_id", "permission")
SELECT rp."role_id", 'form.write'
FROM "RolePermission" rp
WHERE rp."permission" = 'site.write'
ON CONFLICT DO NOTHING;
