import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";

import { parseSiteNameValue } from "../shared/section-settings.js";

import { applyDefaultProductSite } from "./apply-default-product-site.js";
import { isGenericStarterSiteName } from "./default-product-site-content.js";

/**
 * 确保默认租户有已发布的 Marketing CMS 站（产品主域前台）。
 *
 * **不在 server 启动时调用**——由 `seed-local-marketing-site.ts` 等运维脚本按需执行。
 *
 * 幂等：
 * - 已是产品站（站名含 Rewindom）→ 不动
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
    return;
  }

  await applyDefaultProductSite(DEFAULT_TENANT_ID);
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
