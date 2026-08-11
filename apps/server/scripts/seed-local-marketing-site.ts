/**
 * 为指定租户铺一套已发布的营销站。
 *
 * - slug=`default`（产品主域）：be-water 产品官网终稿（首页，中英）+ 使用说明文档库
 * - 其它租户：通用 default starter（仅首页占位）+ 可选文档库
 *
 * 幂等：反复执行会覆盖模板页内容并重新发布。
 *
 *   pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]
 */
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG } from "@be-water/shared";

import { applyDefaultProductSite } from "../../../packages/builtin/marketing/server/apply-default-product-site.js";
import { loadUsageDocs } from "../../../packages/builtin/marketing/server/load-usage-docs.js";
import { seedDocsFromFiles } from "../../../packages/builtin/marketing/server/marketing-doc.service.js";
import {
  applySiteStarter,
  setPageStatus,
  updateSite,
} from "../../../packages/builtin/marketing/server/site.service.js";

async function main(): Promise<void> {
  const slug = process.argv[2]?.trim() || DEFAULT_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  if (tenant.status !== "active") {
    throw new Error(`Tenant is not active: ${slug}`);
  }

  if (slug === DEFAULT_TENANT_SLUG) {
    const { page_count } = await applyDefaultProductSite(tenant.id);
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
    console.log(
      `[seed-local-marketing-site] published product site for tenant=${slug} pages=${page_count}`,
    );
    return;
  }

  const applied = await applySiteStarter(tenant.id, "default");
  await updateSite(tenant.id, { published: true });

  for (const page of applied.pages) {
    if (page.status !== "published") {
      await setPageStatus(tenant.id, page.id, "published");
    }
  }

  console.log(
    `[seed-local-marketing-site] published default starter for tenant=${slug} pages=${applied.pages.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
