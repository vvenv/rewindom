/**
 * 页头 / 页脚导航的文档源：整库目录与按分类展开。
 *
 * 展开逻辑从 marketing 内置的 `docs` / `doc_category` 搬过来；存量数据由
 * marketing 的 parse-time alias 改写成这两个 source。
 */

import { SITE_DOCS_ENTITLEMENT } from "./entitlements.js";
import { readSiteDocsContext } from "./site-docs-context.js";
import {
  DOCS_INDEX_PATH,
  docMessages,
  docPath,
  groupDocsByCategory,
  type PublicDocSummary,
} from "./site-doc.js";

import {
  makeNavLink,
  registerNavSource,
  type NavSourceDefinition,
  type ResolvedNavItem,
  type SiteNavContext,
  type SiteNavItem,
} from "../../marketing/shared/site-nav.js";

export const SITE_DOCS_NAV_SOURCE = "site-docs";
export const SITE_DOCS_CATEGORY_NAV_SOURCE = "site-docs.category";

function docsFromNav(ctx: SiteNavContext): PublicDocSummary[] {
  return readSiteDocsContext(ctx)?.docs ?? [];
}

function docItems(
  docs: readonly PublicDocSummary[],
  ctx: SiteNavContext,
  keyPrefix: string,
): ResolvedNavItem[] {
  return docs.map((doc) =>
    makeNavLink(`${keyPrefix}:${doc.slug}`, doc.title, docPath(doc.slug), ctx),
  );
}

function expandDocsLibrary(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  const docs = docsFromNav(ctx);
  const messages = docMessages(ctx.locale);
  const label =
    typeof item.label === "string" ? item.label : "";
  if (docs.length === 0) return [];
  if (item.expand === "flat") {
    return docItems(docs, ctx, item.id);
  }
  const groups = groupDocsByCategory(docs);
  const children =
    groups.length > 1
      ? groups.flatMap((group) =>
          group.category
            ? [
                {
                  key: `${item.id}:${group.category}`,
                  label: group.category_label,
                  href: "",
                  current: false,
                  children: docItems(
                    group.items,
                    ctx,
                    `${item.id}:${group.category}`,
                  ),
                },
              ]
            : docItems(group.items, ctx, item.id),
        )
      : docItems(docs, ctx, item.id);
  return [
    makeNavLink(
      item.id,
      label || messages.nav,
      DOCS_INDEX_PATH,
      ctx,
      children,
    ),
  ];
}

function expandDocsCategory(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  const docs = docsFromNav(ctx).filter((doc) => doc.category === item.category);
  if (docs.length === 0) return [];
  const items = docItems(docs, ctx, item.id);
  const label = typeof item.label === "string" ? item.label : "";
  const fallbackLabel = docs[0]?.category_label?.trim() || item.category;
  return item.expand === "flat"
    ? items
    : [makeNavLink(item.id, label || fallbackLabel, "", ctx, items)];
}

export const SITE_DOCS_NAV_SOURCE_DEF: NavSourceDefinition = {
  source: SITE_DOCS_NAV_SOURCE,
  label: "site-docs:nav.source.library",
  defaultLabel: "site-docs:nav.source.libraryDefault",
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  defaultExpand: "children",
  expand: expandDocsLibrary,
};

export const SITE_DOCS_CATEGORY_NAV_SOURCE_DEF: NavSourceDefinition = {
  source: SITE_DOCS_CATEGORY_NAV_SOURCE,
  label: "site-docs:nav.source.category",
  defaultLabel: "site-docs:nav.source.categoryDefault",
  entitlement: SITE_DOCS_ENTITLEMENT.key,
  usesCategory: true,
  defaultExpand: "children",
  expand: expandDocsCategory,
};

/** server onBoot 与 client manifest 各调一次（幂等）。 */
export function registerDocsNavSources(): void {
  registerNavSource(SITE_DOCS_NAV_SOURCE_DEF);
  registerNavSource(SITE_DOCS_CATEGORY_NAV_SOURCE_DEF);
}
