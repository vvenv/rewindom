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
    const types = collectSectionTypes([section("hero"), section("faq")]);
    expect([...types].sort()).toEqual(["faq", "hero"]);
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
        sections: [section("pricing"), section("form")],
      },
    ]);
    const types = collectSectionTypes([group]);
    expect([...types].sort()).toEqual(["form", "group", "pricing"]);
  });

  it("累加进同一个集合（页头 / 页脚 / 正文分三次收）", () => {
    const acc = collectSectionTypes([section("header")]);
    collectSectionTypes([section("footer")], acc);
    collectSectionTypes([section("hero")], acc);
    expect([...acc].sort()).toEqual(["footer", "header", "hero"]);
  });

  it("非容器 block 没有 sections，不该炸", () => {
    const withBlocks = section("faq", [
      { id: "b1", type: "qa", settings: { q: "?" } },
    ]);
    expect([...collectSectionTypes([withBlocks])]).toEqual(["faq"]);
  });
});
