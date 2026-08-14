import { describe, expect, it } from "vitest";

import { canonicalizePageIdentity, marketingPagePath } from "./site-cms.js";
import {
  getPageTemplateKind,
  isFirstLevelCatalogPath,
  isPageTemplateRelevant,
  isPublicCatalogPage,
  isPublicCatalogPageKind,
  isTemplatePageKind,
  listPageTemplateKinds,
  registerPageTemplateKind,
} from "./page-templates.js";

describe("模板页注册表", () => {
  it("marketing 自带首页", () => {
    expect(isTemplatePageKind("home")).toBe(true);
    expect(isTemplatePageKind("page")).toBe(false);
    expect(isTemplatePageKind("doc_index")).toBe(false);
  });

  it("kind 决定 slug 与路径——租户改不了地址", () => {
    expect(canonicalizePageIdentity("home", "随便填")).toEqual({
      kind: "home",
      slug: "home",
    });
    expect(marketingPagePath("home", "home")).toBe("/");
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
