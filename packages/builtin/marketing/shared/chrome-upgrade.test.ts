import { describe, expect, it } from "vitest";

import { upgradeChromeSection } from "./chrome-upgrade.js";
import { createSection, type SiteSection  } from "./section-schema.js";
import { defaultHeaderNavItems } from "./site-nav.js";


function legacyHeader(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "hdr-legacy",
    type: "header",
    settings: {
      sticky: true,
      show_logo: true,
      show_site_name: true,
      items: defaultHeaderNavItems(),
      ...settings,
    },
    blocks: [],
  };
}

function legacyFooter(settings: Record<string, unknown> = {}): SiteSection {
  return {
    id: "ftr-legacy",
    type: "footer",
    settings: {
      show_logo: false,
      ...settings,
    },
    blocks: [],
  };
}

describe("upgradeChromeSection", () => {
  it("moves legacy header settings into ordered blocks", () => {
    const upgraded = upgradeChromeSection(
      legacyHeader({
        show_doc_search: true,
        primary_label: "开始",
        primary_href: "/docs",
      }),
    );

    expect(upgraded.blocks.map((block) => block.type)).toEqual([
      "chrome_brand",
      "chrome_nav",
      "chrome_doc_search",
      "chrome_button",
    ]);
    expect(upgraded.settings.items).toBeUndefined();
    expect(upgraded.settings.sticky).toBe(true);
  });

  it("moves legacy footer settings into brand and copyright blocks", () => {
    const upgraded = upgradeChromeSection(
      legacyFooter({
        blurb: "简介",
        copyright: "© 2026 Acme",
      }),
    );

    expect(upgraded.blocks[0]?.type).toBe("chrome_brand");
    expect(upgraded.blocks[0]?.settings.blurb).toBe("简介");
    expect(upgraded.blocks.at(-1)?.type).toBe("chrome_copyright");
    expect(upgraded.blocks.at(-1)?.settings.text).toBe("© 2026 Acme");
  });

  it("is idempotent once chrome blocks exist", () => {
    const once = upgradeChromeSection(createSection("header"));
    const twice = upgradeChromeSection(once);
    expect(twice).toEqual(once);
  });

  /*
   * 「没有 brand 块」曾被当成旧数据的信号，于是默认页脚（只有一个版权块）每读一次
   * 就被塞回一个品牌块——租户删掉，刷新又长回来。
   */
  it("默认页脚原样返回，不塞回品牌块", () => {
    const footer = createSection("footer");
    expect(footer.blocks.map((block) => block.type)).toEqual([
      "chrome_copyright",
    ]);
    expect(upgradeChromeSection(footer)).toEqual(footer);
  });

  it("块被删光也不复活——那是当前格式的合法形态，不是旧数据", () => {
    for (const type of ["header", "footer"] as const) {
      const emptied: SiteSection = { ...createSection(type), blocks: [] };
      expect(upgradeChromeSection(emptied).blocks).toEqual([]);
    }
  });
});
