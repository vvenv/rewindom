/**
 * 收 type 是「按需发 CSS」的取数口径：收少了页面就裸样式。
 */

import { describe, expect, it } from "vitest";

import { collectSectionTypes } from "./collect-types.js";

import type { SiteSection } from "./types.js";

const section = (type: string, blocks: SiteSection["blocks"] = []): SiteSection => ({
  id: `${type}-1`,
  type,
  settings: {},
  blocks,
});

describe("collectSectionTypes", () => {
  it("收顶层段的 type", () => {
    const types = collectSectionTypes([section("hero"), section("prose")]);
    expect([...types].sort()).toEqual(["hero", "prose"]);
  });

  it("同 type 出现多次只算一次", () => {
    expect(collectSectionTypes([section("hero"), section("hero")]).size).toBe(1);
  });

  it("下钻容器段的列——漏了列里的子段，那几段就会裸着渲出来", () => {
    const group = section("group", [
      {
        id: "col-1",
        type: "column",
        settings: {},
        sections: [section("band"), section("form")],
      },
    ]);
    const types = collectSectionTypes([group]);
    expect([...types].sort()).toEqual(["band", "column", "form", "group"]);
  });

  it("累加进同一个集合（页头 / 页脚 / 正文分三次收）", () => {
    const acc = collectSectionTypes([section("header")]);
    collectSectionTypes([section("footer")], acc);
    collectSectionTypes([section("hero")], acc);
    expect([...acc].sort()).toEqual(["footer", "header", "hero"]);
  });

  it("非容器 block 没有 sections，不该炸", () => {
    const withBlocks = section("form", [
      { id: "b1", type: "field", settings: { label: "?" } },
    ]);
    expect([...collectSectionTypes([withBlocks])].sort()).toEqual(["field", "form"]);
  });

  it("页头 chrome 块的 type 也要收——贡献块的 CSS 与按需查库靠它", () => {
    const header = section("header", [
      { id: "b1", type: "chrome_brand", settings: {} },
      { id: "b2", type: "shop.cart-link", settings: {} },
    ]);
    expect([...collectSectionTypes([header])].sort()).toEqual([
      "chrome_brand",
      "header",
      "shop.cart-link",
    ]);
  });

  it("导航 source 也要收——页头挂了贡献源但页面上没有对应段时 context 仍要跑", () => {
    const header = section("header", [
      {
        id: "nav",
        type: "chrome_nav",
        settings: {
          items: [
            {
              id: "d",
              source: "site-docs",
              label: "文档",
              href: "/docs",
              category: "",
              expand: "children",
              children: [],
            },
          ],
        },
      },
    ]);
    expect([...collectSectionTypes([header])]).toContain("site-docs");
  });
});
