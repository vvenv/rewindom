/**
 * 「站内可链地址」的候选表（编辑器 `link` 设置项的下拉数据源）。
 *
 * 页面来自 `MarketingPage`；其它分组（文档篇、商品……）由模块经
 * `registerLinkTargetProvider` 填进来。marketing 不反向 import 那些表。
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import { isTemplatePageKind } from "../shared/page-templates.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
} from "../shared/site-cms.js";
import { type SiteLinkTarget } from "../shared/site-link-target.js";

import { resolveContributedLinkTargets } from "./link-target-providers.js";

/**
 * 候选只列**站点默认语言**那一份。
 *
 * 存的是逻辑路径（`/about`），渲染时各语言页面自己补前缀（`withSiteLocale`）——
 * 一个链接因此在所有语言下都指向对应语言的那一版。逐语言各列一遍不但没用，
 * 还会让人以为要为每种语言分别配一次导航。
 */
export async function listSiteLinkTargets(
  tenant_id: string,
): Promise<SiteLinkTarget[]> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
    select: { default_locale: true },
  });
  const defaultLocale: AppLocale = normalizeLocale(site?.default_locale);

  const pages = await prisma.marketingPage.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ sort_order: "asc" }, { title_draft: "asc" }],
  });

  const pageTargets: SiteLinkTarget[] = [];

  for (const record of pages) {
    if (normalizeLocale(record.locale, defaultLocale) !== defaultLocale) {
      continue;
    }
    const { kind, slug } = canonicalizePageIdentity(record.kind, record.slug);
    // 模板页没有租户自填的地址，不进「填链接」下拉
    if (isTemplatePageKind(kind)) continue;
    pageTargets.push({
      value: marketingPagePath(kind, slug),
      label: record.title_draft || record.title,
      group: "page",
      // 草稿页照列：租户常常先配好导航再发布那一页
      ...(record.status === "published" ? {} : { draft: true }),
    });
  }

  return [
    ...pageTargets,
    ...(await resolveContributedLinkTargets(tenant_id, defaultLocale)),
  ];
}
