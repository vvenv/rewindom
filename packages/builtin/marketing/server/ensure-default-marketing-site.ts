import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

import { loadUsageDocs } from "./load-usage-docs.js";
import { seedDocsFromFiles } from "./marketing-doc.service.js";
import { applySiteStarter, setPageStatus, updateSite } from "./site.service.js";

/**
 * 确保默认租户有已发布的 Marketing CMS 站（产品主域前台）。
 *
 * 幂等：已有已发布首页则跳过；否则 apply `default` starter 并全部发布。
 */
export async function ensureDefaultMarketingSite(): Promise<void> {
  const existingPublishedHome = await prisma.marketingPage.findFirst({
    where: {
      tenant_id: DEFAULT_TENANT_ID,
      kind: "home",
      status: "published",
    },
    select: { id: true },
  });
  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: DEFAULT_TENANT_ID },
    select: { published: true },
  });
  if (existingPublishedHome && site?.published) {
    await ensureDefaultMarketingDocs();
    return;
  }

  const applied = await applySiteStarter(DEFAULT_TENANT_ID, "default");
  await updateSite(DEFAULT_TENANT_ID, { published: true });
  for (const page of applied.pages) {
    if (page.status !== "published") {
      await setPageStatus(DEFAULT_TENANT_ID, page.id, "published");
    }
  }
  await ensureDefaultMarketingDocs();
}

/**
 * 默认租户文档库：从 `docs/usage/*.md` 导入，与 `seed-local-marketing-site` 同一真源。
 *
 * 幂等：已有任意一篇已发布文档时跳过，避免覆盖租户后续编辑。
 */
export async function ensureDefaultMarketingDocs(): Promise<void> {
  const existing = await prisma.marketingDoc.findFirst({
    where: { tenant_id: DEFAULT_TENANT_ID, status: "published" },
    select: { id: true },
  });
  if (existing) return;

  const docs = loadUsageDocs();
  if (docs.length === 0) return;
  await seedDocsFromFiles(DEFAULT_TENANT_ID, docs);
}
