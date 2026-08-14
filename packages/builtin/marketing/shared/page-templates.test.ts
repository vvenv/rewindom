import { describe, expect, it } from "vitest";

import { registerLocaleCatalog } from "@rewindom/shared";

import { canonicalizePageIdentity, marketingPagePath } from "./site-cms.js";
import {
  getPageTemplateKind,
  isFirstLevelCatalogPath,
  isPageTemplateRelevant,
  isPublicCatalogPage,
  isPublicCatalogPageKind,
  isTemplatePageKind,
  listPageTemplateKinds,
  publicCatalogSources,
  registerPageTemplateKind,
  registerPageTemplatePreset,
  resolveCatalogPageTitle,
  resolveTemplatePresetCopy,
  isStockTemplateTitle,
} from "./page-templates.js";

describe("模板页注册表", () => {
  it("marketing 自带首页与 404", () => {
    expect(isTemplatePageKind("home")).toBe(true);
    expect(isTemplatePageKind("not_found")).toBe(true);
    expect(isTemplatePageKind("page")).toBe(false);
    expect(isTemplatePageKind("doc_index")).toBe(false);
    expect(getPageTemplateKind("not_found")?.required_section).toBe(
      "page-missing",
    );
  });

  it("kind 决定 slug 与路径——租户改不了地址", () => {
    expect(canonicalizePageIdentity("home", "随便填")).toEqual({
      kind: "home",
      slug: "home",
    });
    expect(marketingPagePath("home", "home")).toBe("/");
    expect(canonicalizePageIdentity("not_found", "随便填")).toEqual({
      kind: "not_found",
      slug: "404",
    });
    expect(marketingPagePath("not_found", "404")).toBe("/404");
  });

  it("贡献一张模板页后，路径解析立刻跟着走", () => {
    const definition = {
      kind: "demo_login",
      slug: "demo-login",
      path: "/demo/login",
      group: "demo:group",
      label: "demo:label",
      required_section: "demo.form",
    };
    registerPageTemplateKind(definition);

    expect(getPageTemplateKind("demo_login")).toBe(definition);
    expect(canonicalizePageIdentity("demo_login", "别的")).toEqual({
      kind: "demo_login",
      slug: "demo-login",
    });
    expect(marketingPagePath("demo_login", "demo-login")).toBe("/demo/login");
    expect(listPageTemplateKinds().map((template) => template.kind)).toContain(
      "demo_login",
    );

    // 幂等：同一个定义再登记一次不抛
    expect(() => registerPageTemplateKind(definition)).not.toThrow();
  });

  it("撞名直接抛——两个模块共用一个 kind 会让版式被对方接管", () => {
    expect(() =>
      registerPageTemplateKind({
        kind: "home",
        slug: "other",
        path: "/other",
        group: "x",
        label: "x",
        required_section: null,
      }),
    ).toThrow("site.page_kind_conflict:home");
  });

  it("认不出来的 kind 一律当普通页面（slug 归租户）", () => {
    expect(canonicalizePageIdentity("no_such_kind", "关于")).toEqual({
      kind: "page",
      slug: "关于",
    });
    expect(marketingPagePath("page", "about")).toBe("/about");
  });

  it("没有 entitlement 的常驻；声明了的要等开关打开", () => {
    const alwaysOn = {
      kind: "home",
      slug: "home",
      path: "/",
      group: "x",
      label: "x",
      required_section: null,
    };
    const gated = { ...alwaysOn, kind: "shop_index", entitlement: "shop" };
    const none = new Set<string>();
    const shopOn = new Set(["shop"]);

    expect(isPageTemplateRelevant(alwaysOn, none)).toBe(true);
    expect(isPageTemplateRelevant(gated, none)).toBe(false);
    expect(isPageTemplateRelevant(gated, shopOn)).toBe(true);
  });
});

describe("公开页面目录", () => {
  it("一级可打开路径才进目录", () => {
    expect(isFirstLevelCatalogPath("/docs")).toBe(true);
    expect(isFirstLevelCatalogPath("/shop")).toBe(true);
    expect(isFirstLevelCatalogPath("/")).toBe(false);
    expect(isFirstLevelCatalogPath("/docs/:slug")).toBe(false);
    expect(isFirstLevelCatalogPath("/shop/cart")).toBe(false);
    expect(isFirstLevelCatalogPath("/member/login")).toBe(false);
  });

  it("普通页进目录；首页、详情模板、二级功能页不进", () => {
    registerPageTemplateKind({
      kind: "nav_demo_index",
      slug: "demo",
      path: "/demo",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplateKind({
      kind: "nav_demo_item",
      slug: "demo-item",
      path: "/demo/:slug",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplateKind({
      kind: "nav_demo_cart",
      slug: "demo-cart",
      path: "/demo/cart",
      group: "x",
      label: "x",
      required_section: null,
    });

    expect(isPublicCatalogPageKind("page")).toBe(true);
    expect(isPublicCatalogPageKind("home")).toBe(false);
    expect(isPublicCatalogPageKind("not_found")).toBe(false);
    expect(isPublicCatalogPageKind("nav_demo_index")).toBe(true);
    expect(isPublicCatalogPageKind("nav_demo_item")).toBe(false);
    expect(isPublicCatalogPageKind("nav_demo_cart")).toBe(false);
  });

  it("未开通的模块一级页不进公开目录", () => {
    registerPageTemplateKind({
      kind: "nav_gated_index",
      slug: "gated",
      path: "/gated",
      group: "x",
      label: "x",
      required_section: null,
      entitlement: "gated-mod",
    });

    expect(isPublicCatalogPageKind("nav_gated_index")).toBe(true);
    expect(isPublicCatalogPage("nav_gated_index")).toBe(false);
    expect(isPublicCatalogPage("nav_gated_index", new Set())).toBe(false);
    expect(isPublicCatalogPage("nav_gated_index", new Set(["gated-mod"]))).toBe(
      true,
    );
    expect(isPublicCatalogPage("page")).toBe(true);
    expect(isPublicCatalogPage("page", new Set())).toBe(true);
  });
});

describe("公开目录跨语言借用", () => {
  const kind = "catalog_i18n_index";
  const page = (locale: string, title: string) => ({
    kind,
    slug: "shop",
    locale,
    title,
  });

  it("当前语言缺模板页时借用默认语言行，标题走预设", () => {
    registerPageTemplateKind({
      kind,
      slug: "shop",
      path: "/shop",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplatePreset(kind, {
      key: kind,
      label: "x",
      kind,
      slug: "shop",
      titleKey: "catalog-i18n:nav.title",
      descriptionKey: "catalog-i18n:nav.sub",
      sections: [],
    });
    registerLocaleCatalog("catalog-i18n", {
      "zh-CN": { nav: { title: "商店", sub: "在售" } },
      en: { nav: { title: "Shop", sub: "For sale" } },
    });

    const pages = [
      { kind: "page", slug: "about", locale: "zh-CN", title: "关于" },
      page("zh-CN", "商品"),
    ];
    const sources = publicCatalogSources(pages, "en", "zh-CN");
    expect(sources).toEqual([
      { page: page("zh-CN", "商品"), localizeFromPreset: true },
    ]);
    expect(resolveTemplatePresetCopy(kind, "en")).toEqual({
      title: "Shop",
      description: "For sale",
    });
  });

  it("当前语言已有模板页就用那一行，不借用", () => {
    const sources = publicCatalogSources(
      [page("zh-CN", "商品"), page("en", "Store")],
      "en",
      "zh-CN",
    );
    expect(sources).toEqual([
      { page: page("en", "Store"), localizeFromPreset: false },
    ]);
  });
});

describe("库存模板标题", () => {
  const kind = "stock_shop_index";

  it("旧译名「商品」按当前语言换成商店 / Shop", () => {
    registerPageTemplateKind({
      kind,
      slug: "stock-shop",
      path: "/stock-shop",
      group: "x",
      label: "x",
      required_section: null,
    });
    registerPageTemplatePreset(kind, {
      key: kind,
      label: "x",
      kind,
      slug: "stock-shop",
      titleKey: "shop:storefront.catalog.title",
      descriptionKey: "shop:storefront.catalog.subtitle",
      sections: [],
    });
    registerLocaleCatalog("shop", {
      "zh-CN": { storefront: { catalog: { title: "商店", subtitle: "在售" } } },
      en: { storefront: { catalog: { title: "Shop", subtitle: "For sale" } } },
    });

    expect(isStockTemplateTitle(kind, "商品")).toBe(true);
    expect(isStockTemplateTitle(kind, "Products")).toBe(true);
    expect(isStockTemplateTitle(kind, "Our store")).toBe(false);
    expect(resolveCatalogPageTitle(kind, "en", "商品")).toBe("Shop");
    expect(resolveCatalogPageTitle(kind, "zh-CN", "商品")).toBe("商店");
    expect(resolveCatalogPageTitle(kind, "en", "Our store")).toBe("Our store");
    expect(
      resolveCatalogPageTitle(kind, "en", "Our store", { forcePreset: true }),
    ).toBe("Shop");
  });
});
