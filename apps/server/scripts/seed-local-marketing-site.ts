/**
 * 为指定租户铺一套已发布的默认 starter 营销站（home / docs / pricing）。
 *
 * 幂等：反复执行会覆盖 starter 内容并重新发布。
 *
 *   pnpm --filter server exec tsx scripts/seed-local-marketing-site.ts [tenantSlug]
 *
 * 默认 slug：`default`（产品主域隐式绑定的组织）。
 */
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_SLUG } from "@be-water/shared";

import {
  applySiteStarter,
  setPageStatus,
  updateSite,
} from "../../../packages/modules/marketing/server/site.service.js";
import { SITE } from "../../../packages/modules/marketing/shared/site.js";

async function main(): Promise<void> {
  const slug = process.argv[2]?.trim() || DEFAULT_TENANT_SLUG;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new Error(`Tenant not found: ${slug}`);
  }
  if (tenant.status !== "active") {
    throw new Error(`Tenant is not active: ${slug}`);
  }

  const applied = await applySiteStarter(tenant.id, "default");
  await updateSite(tenant.id, {
    site_name: SITE.name,
    tagline: SITE.tagline,
    published: true,
  });

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
