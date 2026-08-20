/* eslint-disable no-console */
/**
 * 为指定租户铺一套已发布的营销站。
 *
 * - slug=`rewindom`（`DEFAULT_TENANT_SLUG`，产品主域）：Rewindom 产品官网终稿（首页，中英）+ 使用说明文档库 + 品牌资产
 * - 其它租户：通用 default starter（仅首页占位）+ 可选文档库
 *
 * 幂等：反复执行会覆盖模板页内容并重新发布。产品站会再跑一次
 * `apply-rewindom-brand.ts`，避免 `theme_settings` 整列覆盖把 logo 抹掉。
 *
 *   pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { applyDefaultProductSite } from "@rewindom/builtin/marketing/server/apply-default-product-site.js";
import { initializeTenantSite } from "@rewindom/builtin/marketing/server/site-init.service.js";
import { updateSite } from "@rewindom/builtin/marketing/server/site.service.js";
import { ensureDefaultTenant } from "@rewindom/builtin/platform/server/services/ensure-default-tenant.service.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG } from "@rewindom/shared";

import { loadUsageDocs } from "../../../modules/site-docs/server/load-usage-docs.js";
import { seedDocsFromFiles } from "../../../modules/site-docs/server/site-doc.service.js";
import { registerDocsPageTemplates } from "../../../modules/site-docs/shared/page-templates.js";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function applyRewindomBrand(slug: string): void {
  const scriptPath = join(SCRIPT_DIR, "apply-rewindom-brand.ts");
  const result = spawnSync(
    "pnpm",
    ["--filter", "server", "exec", "tsx", scriptPath, "--slug", slug],
    {
      stdio: "inherit",
      env: process.env,
      cwd: join(SCRIPT_DIR, "../../.."),
      shell: false,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`apply-rewindom-brand.ts exited with ${result.status ?? "null"}`);
  }
}

async function main(): Promise<void> {
  registerDocsPageTemplates();
  const slug = process.argv[2]?.trim() || DEFAULT_TENANT_SLUG;
  if (slug === DEFAULT_TENANT_SLUG) {
    await ensureDefaultTenant();
  }
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  if (tenant.status !== "active") {
    throw new Error(`Tenant is not active: ${slug}`);
  }

  if (slug === DEFAULT_TENANT_SLUG) {
    const { page_count } = await applyDefaultProductSite(tenant.id);
    await initializeTenantSite(tenant.id, "zh-CN");
    const docs = loadUsageDocs();
    if (docs.length > 0) {
      const seeded = await seedDocsFromFiles(tenant.id, docs);
      const created = seeded.filter((r) => r.created).length;
      const byLocale = [...new Set(seeded.map((r) => r.locale))]
        .map(
          (locale) =>
            `${locale}=${seeded.filter((r) => r.locale === locale).length}`,
        )
        .join(" ");
      console.log(
        `[seed-local-marketing-site] seeded ${seeded.length} docs (${byLocale}, created=${created}) for tenant=${slug}`,
      );
    } else {
      console.warn("[seed-local-marketing-site] no usage docs found");
    }
    applyRewindomBrand(slug);
    console.log(
      `[seed-local-marketing-site] published product site for tenant=${slug} pages=${page_count}`,
    );
    return;
  }

  const applied = await initializeTenantSite(tenant.id, "zh-CN", {
    page_status: "published",
  });
  await updateSite(tenant.id, { published: true });

  console.log(
    `[seed-local-marketing-site] published default starter for tenant=${slug} created_site=${applied.created_site} pages=${applied.created_pages.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
