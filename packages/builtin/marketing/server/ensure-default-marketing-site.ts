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
 * 默认租户文档库：从 `docs/usage/<locale>/*.md` 导入，与 `seed-local-marketing-site`
 * 同一真源（内容在构建期内联，见 `load-usage-docs.ts`）。
 *
 * 幂等**按语言算**：某个语言已有已发布文档就跳过那一份，避免覆盖租户后续编辑；
 * 后续补一门新语言时，老语言不受影响，新语言在下次启动自动铺进去——整库一刀切的
 * 判断会让「已经有中文了」永久挡住英文版的初始化。
 */
export async function ensureDefaultMarketingDocs(): Promise<void> {
  const seeded = await prisma.marketingDoc.findMany({
    where: { tenant_id: DEFAULT_TENANT_ID, status: "published" },
    select: { locale: true },
    distinct: ["locale"],
  });
  const seededLocales = new Set(seeded.map((doc) => doc.locale));

  const docs = loadUsageDocs().filter((doc) => !seededLocales.has(doc.locale));
  if (docs.length === 0) return;
  await seedDocsFromFiles(DEFAULT_TENANT_ID, docs);
}
