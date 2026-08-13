import { beforeAll, describe, expect, it } from "vitest";

import { registerDocsPageTemplates } from "../../site-docs/shared/page-templates.js";
import { canonicalizePageIdentity, marketingPagePath } from "./site-cms.js";
import {
  getPageTemplateKind,
  isPageTemplateRelevant,
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

describe("site-docs 贡献的模板页", () => {
  beforeAll(() => {
    registerDocsPageTemplates();
  });

  it("登记后 kind 决定 slug 与路径", () => {
    expect(isTemplatePageKind("docs_index")).toBe(true);
    expect(isTemplatePageKind("docs_article")).toBe(true);
    expect(canonicalizePageIdentity("docs_index", "随便填")).toEqual({
      kind: "docs_index",
      slug: "docs",
    });
    expect(marketingPagePath("docs_index", "docs")).toBe("/docs");
    expect(marketingPagePath("docs_article", "docs-article")).toBe(
      "/docs/:slug",
    );
  });
});
