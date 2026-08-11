import { describe, expect, it } from "vitest";

import {
  addableBlockDefinitions,
  createBlock,
  createSection,
  type SiteSection,
} from "../../section-schema.js";
import { blankNavItem } from "../../site-nav.js";

import { collectHeaderNavItems } from "./chrome-blocks.js";

function headerWithNav(...labels: string[]): SiteSection {
  const header = createSection("header");
  return {
    ...header,
    blocks: header.blocks.map((block) =>
      block.type === "chrome_nav"
        ? {
            ...block,
            settings: {
              ...block.settings,
              items: labels.map((label) => ({ ...blankNavItem(), label })),
            },
          }
        : block,
    ),
  };
}

describe("collectHeaderNavItems", () => {
  /*
   * 「从页头复制」曾经去读页头 section 的 settings.items——导航搬进 chrome_nav 块之后
   * 那儿永远是空的，于是页脚那颗按钮一直是灰的，点不动也没人知道为什么。
   */
  it("从 chrome_nav 块里取条目，而不是 section settings", () => {
    const header = headerWithNav("产品", "定价");

    expect(header.settings.items).toBeUndefined();
    expect(collectHeaderNavItems([header]).map((item) => item.label)).toEqual([
      "产品",
      "定价",
    ]);
  });

  it("跨页头区所有段拼起来，没有导航块时是空数组", () => {
    const bare: SiteSection = { ...createSection("header"), blocks: [] };

    expect(collectHeaderNavItems([bare])).toEqual([]);
    expect(collectHeaderNavItems([bare, headerWithNav("文档")])).toHaveLength(1);
  });
});

describe("addableBlockDefinitions", () => {
  it("单例块加过就不再出现在菜单里", () => {
    const header = createSection("header");
    const addable = addableBlockDefinitions(header).map((def) => def.type);

    // 默认预置了品牌与导航，两个都是单例
    expect(header.blocks.map((block) => block.type)).toEqual([
      "chrome_brand",
      "chrome_nav",
    ]);
    expect(addable).not.toContain("chrome_brand");
    expect(addable).not.toContain("chrome_nav");
    expect(addable).toContain("chrome_locale");
  });

  it("按钮与页脚链接列不是单例，加了还能再加", () => {
    const footer = createSection("footer");
    const withColumn: SiteSection = {
      ...footer,
      blocks: [...footer.blocks, createBlock("footer", "menu_column")],
    };

    expect(addableBlockDefinitions(withColumn).map((def) => def.type)).toContain(
      "menu_column",
    );
    // 版权是单例，预置过就没了
    expect(
      addableBlockDefinitions(withColumn).map((def) => def.type),
    ).not.toContain("chrome_copyright");
  });
});
