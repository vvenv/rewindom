import { beforeEach, describe, expect, it } from "vitest";

import {
  resetNavSourceContributions,
  resolveNavItems,
  type SiteNavContext,
  type SiteNavItem,
} from "@rewindom/builtin/marketing/shared/site-nav.js";

import { SHOP_ENTITLEMENT } from "./entitlements.js";
import {
  SHOP_COLLECTION_NAV_SOURCE,
  SHOP_NAV_SOURCE,
  SHOP_COLLECTION_NAV_SOURCE_DEF,
  registerShopNavSources,
} from "./nav-sources.js";
import {
  emptyShopContext,
  shopContextEntry,
  type ShopCollectionCardView,
} from "./shop-section-context.js";

function collection(
  slug: string,
  overrides: Partial<ShopCollectionCardView> = {},
): ShopCollectionCardView {
  return {
    slug,
    parent_slug: null,
    href: `/shop/collections/${slug}`,
    title: slug,
    product_count: 1,
    sort_order: 0,
    ...overrides,
  };
}

const COLLECTIONS = [
  collection("men", { title: "男装", sort_order: 0 }),
  collection("tops", { title: "上衣", parent_slug: "men", sort_order: 0 }),
  collection("pants", { title: "裤装", parent_slug: "men", sort_order: 1 }),
  collection("gear", { title: "配件", sort_order: 1 }),
];

function ctx(
  collections: readonly ShopCollectionCardView[] = COLLECTIONS,
): SiteNavContext {
  return {
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    contributed: shopContextEntry(
      emptyShopContext({ collections: [...collections] }),
    ),
    enabledEntitlements: new Set([SHOP_ENTITLEMENT.key]),
  };
}

function item(overrides: Partial<SiteNavItem> = {}): SiteNavItem {
  return {
    id: "n1",
    source: SHOP_NAV_SOURCE,
    label: "",
    href: "",
    category: "",
    expand: "children",
    children: [],
    ...overrides,
  };
}

describe("shop nav sources", () => {
  beforeEach(() => {
    resetNavSourceContributions();
    registerShopNavSources();
  });

  it("目录源收成一条「商店」，下挂分类树", () => {
    const [root, ...rest] = resolveNavItems([item()], ctx());
    expect(rest).toHaveLength(0);
    expect(root).toMatchObject({ label: "商店", href: "/shop" });
    expect(root?.children.map((child) => child.label)).toEqual([
      "男装",
      "配件",
    ]);
    expect(root?.children[0]?.children.map((child) => child.href)).toEqual([
      "/shop/collections/tops",
      "/shop/collections/pants",
    ]);
  });

  it("目录源 flat 把顶层分类铺平", () => {
    const items = resolveNavItems([item({ expand: "flat" })], ctx());
    expect(items.map((entry) => entry.label)).toEqual(["男装", "配件"]);
  });

  /* 文档库没有文档就整条消失；店面目录是一张真实页面，链接要留住。 */
  it("没有分类时仍留下商店入口", () => {
    const items = resolveNavItems([item()], ctx([]));
    expect(items).toEqual([
      expect.objectContaining({ label: "商店", href: "/shop", children: [] }),
    ]);
  });

  it("租户没开通商店时整条不渲染", () => {
    const items = resolveNavItems([item()], {
      ...ctx(),
      enabledEntitlements: new Set(),
    });
    expect(items).toEqual([]);
  });

  it("分类源挂当前分类与它的子分类", () => {
    const [root] = resolveNavItems(
      [item({ source: SHOP_COLLECTION_NAV_SOURCE, category: "men" })],
      ctx(),
    );
    expect(root).toMatchObject({
      label: "男装",
      href: "/shop/collections/men",
    });
    expect(root?.children.map((child) => child.label)).toEqual([
      "上衣",
      "裤装",
    ]);
  });

  it("分类源 flat 只铺子分类", () => {
    const items = resolveNavItems(
      [
        item({
          source: SHOP_COLLECTION_NAV_SOURCE,
          category: "men",
          expand: "flat",
        }),
      ],
      ctx(),
    );
    expect(items.map((entry) => entry.label)).toEqual(["上衣", "裤装"]);
  });

  it("分类被删或撤回发布时整条不渲染", () => {
    const items = resolveNavItems(
      [item({ source: SHOP_COLLECTION_NAV_SOURCE, category: "gone" })],
      ctx(),
    );
    expect(items).toEqual([]);
  });

  /* 没商品也没子分类的分类进了导航就是个空态死路。 */
  it("空分类不进导航", () => {
    const [root] = resolveNavItems(
      [item()],
      ctx([collection("men", { title: "男装", product_count: 0 })]),
    );
    expect(root).toMatchObject({ href: "/shop", children: [] });
  });

  it("编辑器分类下拉给出已发布分类", () => {
    expect(
      SHOP_COLLECTION_NAV_SOURCE_DEF.categoryOptions?.(
        shopContextEntry(emptyShopContext({ collections: [...COLLECTIONS] })),
      ),
    ).toEqual([
      { key: "men", label: "男装" },
      { key: "tops", label: "上衣" },
      { key: "pants", label: "裤装" },
      { key: "gear", label: "配件" },
    ]);
  });
});
