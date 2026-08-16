/**
 * 页头 / 页脚导航的商店源：整个目录与某个分类。
 *
 * 分类树本来就画在页面段里（`shop.collection-list`），但导航条上以前只能手填一条
 * 指向 `/shop` 的链接——分类换了名字、加了新枝，页头不会跟着动。两个源与
 * site-docs 的「整库 / 某分类」一一对应：
 *
 * | source            | children（默认）           | flat                     |
 * | ----------------- | -------------------------- | ------------------------ |
 * | `shop`            | 「商店」一条，下挂分类树   | 顶层分类各占一条         |
 * | `shop.collection` | 该分类一条，下挂其子分类   | 其子分类各占一条         |
 *
 * 分类数据与段渲染同一份（`contributed.shop.collections`，由 SSR 的
 * `registerSectionContextProvider` / 编辑器的 provider 填）。空分类不进导航——
 * 点进去什么都没有的入口不如不给。
 */

import {
  ROOT_COLLECTION_ALL,
  sliceCollectionTree,
  type ShopCollectionTreeNode,
} from "./collection.js";
import { SHOP_ENTITLEMENT } from "./entitlements.js";
import { readShopContext, SHOP_INDEX_PATH } from "./shop-section-context.js";

import {
  makeNavLink,
  registerNavSource,
  resolveNavLabel,
  type NavCategoryOption,
  type NavSourceDefinition,
  type ResolvedNavItem,
  type SiteNavContext,
  type SiteNavItem,
} from "@rewindom/builtin/marketing/shared/site-nav.js";

export const SHOP_NAV_SOURCE = "shop";
export const SHOP_COLLECTION_NAV_SOURCE = "shop.collection";

/**
 * 切多深。页头横排的下拉面板只画到孙级（`chrome-html` 的 `nav-menu-panel`），
 * 再深的层在页脚竖列里才展得开，切太深等于白查。
 */
const NAV_TREE_DEPTH = 3;

/** SSR 与公开页没有 i18next，源自己带一份兜底文案（同 `docMessages` 的口径）。 */
export function shopNavFallbackLabel(locale: string): string {
  return locale.startsWith("zh") ? "商店" : "Shop";
}

function navTree(
  ctx: SiteNavContext,
  options: { root_slug: string; include_root: boolean },
): ShopCollectionTreeNode[] {
  const shop = readShopContext(ctx);
  return sliceCollectionTree(shop?.collections ?? [], {
    root_slug: options.root_slug,
    depth: NAV_TREE_DEPTH,
    include_root: options.include_root,
    /* 空分类不进导航：点进去只有空态的入口不如不给。 */
    show_empty: false,
  });
}

function treeItems(
  nodes: readonly ShopCollectionTreeNode[],
  ctx: SiteNavContext,
  keyPrefix: string,
): ResolvedNavItem[] {
  return nodes.map((node) =>
    makeNavLink(
      `${keyPrefix}:${node.slug}`,
      node.title,
      node.href,
      ctx,
      treeItems(node.children, ctx, `${keyPrefix}:${node.slug}`),
    ),
  );
}

/**
 * 整个目录。
 *
 * 与文档库不同的是：**没有分类也照样留下「商店」这一条**。`/shop` 是一张真实的
 * 一级页面，商品还没归类的站点删掉它等于把店面入口弄丢了。
 */
function expandShopCatalog(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  const label =
    resolveNavLabel(item.label, ctx, SHOP_INDEX_PATH) ||
    shopNavFallbackLabel(ctx.locale);
  const nodes = navTree(ctx, {
    root_slug: ROOT_COLLECTION_ALL,
    include_root: true,
  });
  if (item.expand === "flat") {
    return nodes.length === 0
      ? [makeNavLink(item.id, label, SHOP_INDEX_PATH, ctx)]
      : treeItems(nodes, ctx, item.id);
  }
  return [
    makeNavLink(
      item.id,
      label,
      SHOP_INDEX_PATH,
      ctx,
      treeItems(nodes, ctx, item.id),
    ),
  ];
}

/** 某个分类：`category` 存分类 slug（编辑器从下拉里选，不手填）。 */
function expandShopCollection(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  if (!item.category) return [];
  const [root] = navTree(ctx, {
    root_slug: item.category,
    include_root: true,
  });
  /* 分类被删 / 撤回发布 / 清空了商品：整条不渲染，别在页头留个 404 入口。 */
  if (!root) return [];
  const children = treeItems(root.children, ctx, item.id);
  const label = resolveNavLabel(item.label, ctx, root.href) || root.title;
  if (item.expand === "flat") {
    return children.length > 0
      ? children
      : [makeNavLink(item.id, label, root.href, ctx)];
  }
  return [makeNavLink(item.id, label, root.href, ctx, children)];
}

/** 编辑器分类下拉：已发布分类，父分类在前（与工作台分类表同一顺序）。 */
function shopCollectionOptions(
  contributed: Readonly<Record<string, unknown>> | undefined,
): NavCategoryOption[] {
  const shop = readShopContext({ contributed });
  return (shop?.collections ?? []).map((collection) => ({
    key: collection.slug,
    label: collection.title,
  }));
}

export const SHOP_NAV_SOURCE_DEF: NavSourceDefinition = {
  source: SHOP_NAV_SOURCE,
  label: "shop:nav.source.catalog",
  defaultLabel: "shop:nav.source.catalogDefault",
  entitlement: SHOP_ENTITLEMENT.key,
  defaultExpand: "children",
  expand: expandShopCatalog,
};

export const SHOP_COLLECTION_NAV_SOURCE_DEF: NavSourceDefinition = {
  source: SHOP_COLLECTION_NAV_SOURCE,
  label: "shop:nav.source.collection",
  defaultLabel: "shop:nav.source.collectionDefault",
  entitlement: SHOP_ENTITLEMENT.key,
  usesCategory: true,
  categoryOptions: shopCollectionOptions,
  defaultExpand: "children",
  expand: expandShopCollection,
};

/** server onBoot 与 client manifest 各调一次（幂等）。 */
export function registerShopNavSources(): void {
  registerNavSource(SHOP_NAV_SOURCE_DEF);
  registerNavSource(SHOP_COLLECTION_NAV_SOURCE_DEF);
}
