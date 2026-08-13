/**
 * 「站内可链地址」的候选表（编辑器 `link` 设置项的下拉数据源）。
 *
 * 跨了两张表（`MarketingPage` / `MarketingDoc`），所以不住在任何一个 service 里面
 * ——放进 `site.service` 会让页面模块反过来依赖文档模块，放进 `marketing-doc.service`
 * 则相反。它本来就是**给编辑器看的一张聚合视图**，独立成文件最诚实。
 */

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import {
  DOCS_INDEX_PATH,
  docMessages,
  docPath,
} from "../shared/marketing-doc.js";
import { isTemplatePageKind } from "../shared/page-templates.js";
import {
  canonicalizePageIdentity,
  marketingPagePath,
} from "../shared/site-cms.js";
import { type SiteLinkTarget } from "../shared/site-link-target.js";

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

  const [pages, docs] = await Promise.all([
    prisma.marketingPage.findMany({
      where: withTenantScope(tenant_id),
      orderBy: [{ sort_order: "asc" }, { title_draft: "asc" }],
    }),
    prisma.marketingDoc.findMany({
      where: withTenantScope(tenant_id),
      orderBy: [
        { category_draft: "asc" },
        { sort_order_draft: "asc" },
        { title_draft: "asc" },
      ],
    }),
  ]);

  const targets: SiteLinkTarget[] = [];

  for (const record of pages) {
    if (normalizeLocale(record.locale, defaultLocale) !== defaultLocale) {
      continue;
    }
    const { kind, slug } = canonicalizePageIdentity(record.kind, record.slug);
    // 文档模板页没有自己的地址：`/docs` 由下面的文档索引项代表，详情模板更是没有
    if (isTemplatePageKind(kind)) continue;
    targets.push({
      value: marketingPagePath(kind, slug),
      label: record.title_draft || record.title,
      group: "page",
      // 草稿页照列：租户常常先配好导航再发布那一页
      ...(record.status === "published" ? {} : { draft: true }),
    });
  }

  /*
   * 文档索引恒列，**即使一篇文档都还没有**。
   *
   * 它是一个固定地址（`/docs`），不像页面那样"没有就是没有"；租户想先把「文档」
   * 放进页头再去写第一篇，是完全正常的顺序。
   */
  targets.push({
    value: DOCS_INDEX_PATH,
    label: docMessages(defaultLocale).nav,
    group: "doc",
  });

  for (const doc of docs) {
    if (normalizeLocale(doc.locale, defaultLocale) !== defaultLocale) continue;
    targets.push({
      value: docPath(doc.slug),
      label: doc.title_draft || doc.title,
      group: "doc",
      ...(doc.category_draft ? { hint: doc.category_draft } : {}),
      ...(doc.status === "published" ? {} : { draft: true }),
    });
  }

  return targets;
}
