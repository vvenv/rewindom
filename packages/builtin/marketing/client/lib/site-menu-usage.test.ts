import { describe, expect, it } from "vitest";

import type { SiteSection } from "../../shared/section-schema.js";

import { siteMenuUsage } from "./site-menu-usage.js";

/** 测试里的 `t` 原样返回 key——断言看的是「指到了哪一处」，不是文案本身。 */
const t = (key: string): string => key;

function header(menu: string): SiteSection {
  return { id: "h1", type: "header", settings: { menu }, blocks: [] };
}

function footer(...columns: string[]): SiteSection {
  return {
    id: "f1",
    type: "footer",
    settings: {},
    blocks: columns.map((menu, index) => ({
      id: `col-${index}`,
      type: "menu_column",
      settings: { menu },
    })),
  };
}

describe("siteMenuUsage", () => {
  it("finds menus referenced by sections and by blocks", () => {
    expect(siteMenuUsage([header("main"), footer("main", "legal")], t)).toEqual({
      main: [
        "editor.sectionType.header",
        "editor.sectionType.footer · editor.blockType.menu_column 1",
      ],
      legal: ["editor.sectionType.footer · editor.blockType.menu_column 2"],
    });
  });

  it("numbers same-type blocks by position so columns are tellable apart", () => {
    const usage = siteMenuUsage([footer("a", "b", "c")], t);
    expect(usage.c).toEqual([
      "editor.sectionType.footer · editor.blockType.menu_column 3",
    ]);
  });

  it("ignores empty references", () => {
    expect(siteMenuUsage([header(""), footer("")], t)).toEqual({});
  });

  it("ignores sections whose definition is gone", () => {
    const orphan: SiteSection = {
      id: "x",
      type: "no-such-section",
      settings: { menu: "main" },
      blocks: [],
    };
    expect(siteMenuUsage([orphan], t)).toEqual({});
  });
});
