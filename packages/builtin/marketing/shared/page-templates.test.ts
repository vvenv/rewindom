import { describe, expect, it } from "vitest";

import {
  canonicalizePageIdentity,
  marketingPagePath,
} from "./site-cms.js";
import {
  getPageTemplateKind,
  isTemplatePageKind,
  listPageTemplateKinds,
  registerPageTemplateKind,
} from "./page-templates.js";

describe("模板页注册表", () => {
  it("marketing 自带文档库的两张版式", () => {
    expect(isTemplatePageKind("doc_index")).toBe(true);
    expect(isTemplatePageKind("doc_article")).toBe(true);
    expect(isTemplatePageKind("page")).toBe(false);
    expect(isTemplatePageKind("home")).toBe(true);
  });

  it("kind 决定 slug 与路径——租户改不了地址", () => {
    expect(canonicalizePageIdentity("doc_index", "随便填")).toEqual({
      kind: "doc_index",
      slug: "docs",
    });
    expect(marketingPagePath("doc_index", "docs")).toBe("/docs");
    // 详情模板是一个**模板路径**，不是能打开的地址
    expect(marketingPagePath("doc_article", "docs-article")).toBe(
      "/docs/:slug",
    );
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
    expect(
      listPageTemplateKinds().map((template) => template.kind),
    ).toContain("demo_login");

    // 幂等：同一个定义再登记一次不抛
    expect(() => registerPageTemplateKind(definition)).not.toThrow();
  });

  it("撞名直接抛——两个模块共用一个 kind 会让版式被对方接管", () => {
    expect(() =>
      registerPageTemplateKind({
        kind: "doc_index",
        slug: "docs",
        path: "/docs",
        group: "x",
        label: "x",
        required_section: null,
      }),
    ).toThrow("site.page_kind_conflict:doc_index");
  });

  it("认不出来的 kind 一律当普通页面（slug 归租户）", () => {
    expect(canonicalizePageIdentity("no_such_kind", "关于")).toEqual({
      kind: "page",
      slug: "关于",
    });
    expect(marketingPagePath("page", "about")).toBe("/about");
  });
});
