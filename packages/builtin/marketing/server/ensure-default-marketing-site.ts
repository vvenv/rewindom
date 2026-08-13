import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";

import { parseSiteNameValue } from "../shared/section-settings.js";

import { applyDefaultProductSite } from "./apply-default-product-site.js";
import { isGenericStarterSiteName } from "./default-product-site-content.js";
import { loadUsageDocs } from "./load-usage-docs.js";
import { seedDocsFromFiles } from "./marketing-doc.service.js";

/**
 * 确保默认租户有已发布的 Marketing CMS 站（产品主域前台）。
 *
 * **不在 server 启动时调用**——由 `seed-local-marketing-site.ts` 等运维脚本按需执行。
 *
 * 幂等：
 * - 已是产品站（站名含 Rewindom）→ 只补文档
 * - 仍是通用 starter 占位（「我的站点」）或尚未发布 → 铺产品站终稿并发布
 */
export async function ensureDefaultMarketingSite(): Promise<void> {
  const site = await prisma.marketingSite.findUnique({
    where: { tenant_id: DEFAULT_TENANT_ID },
    select: { published: true, site_name: true },
  });
  const existingPublishedHome = await prisma.marketingPage.findFirst({
    where: {
      tenant_id: DEFAULT_TENANT_ID,
      kind: "home",
      status: "published",
    },
    select: { id: true },
  });

  const displayName = resolveSiteNameScalar(site?.site_name);
  const alreadyProduct =
    Boolean(site?.published) &&
    Boolean(existingPublishedHome) &&
    displayName.toLowerCase().includes("rewindom");
  const stillPlaceholder =
    !displayName || isGenericStarterSiteName(displayName);

  if (alreadyProduct && !stillPlaceholder) {
    await ensureDefaultMarketingDocs();
    return;
  }

  await applyDefaultProductSite(DEFAULT_TENANT_ID);
  await ensureDefaultMarketingDocs();
}

function resolveSiteNameScalar(value: unknown): string {
  const parsed = parseSiteNameValue(value ?? "");
  if (typeof parsed === "string") return parsed.trim();
  return (
    parsed.__i18n["zh-CN"]?.trim() ||
    parsed.__i18n.en?.trim() ||
    Object.values(parsed.__i18n).find((text) => text.trim())?.trim() ||
    ""
  );
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
