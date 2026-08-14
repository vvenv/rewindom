import { describe, expect, it } from "vitest";

import { HOME_STARTER_PRESET } from "./page-presets.js";
import {
  buildMinimalSiteChrome,
  buildSiteStarter,
  buildSiteStarterChrome,
  DEFAULT_SITE_STARTER_PAGES,
} from "./site-starters.js";

describe("buildMinimalSiteChrome", () => {
  it("ships default header nav and a copyright-only footer", () => {
    const chrome = buildMinimalSiteChrome();

    expect(chrome.header).toHaveLength(1);
    expect(chrome.header[0]?.type).toBe("header");
    const navBlock = chrome.header[0]?.blocks.find(
      (block) => block.type === "chrome_nav",
    );
    expect(navBlock?.settings.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "pages" })]),
    );
    expect(chrome.footer).toHaveLength(1);
    expect(chrome.footer[0]?.blocks.map((block) => block.type)).toEqual([
      "chrome_text",
    ]);
  });

  it("版权是带占位符的文本块，不烤死年份与站名", () => {
    const text = buildMinimalSiteChrome().footer[0]?.blocks.find(
      (block) => block.type === "chrome_text",
    );

    // 建站那天写死 `© 2026 Acme`，跨年就停在去年、改站名也不跟着变
    expect(text?.settings.text).toEqual({
      __i18n: { "zh-CN": "© {year} {site}", en: "© {year} {site}" },
    });
  });
});

describe("buildSiteStarterChrome", () => {
  it("builds header and footer; header ships default nav items", () => {
    const chrome = buildSiteStarterChrome();

    expect(chrome.header).toHaveLength(1);
    expect(chrome.header[0]?.type).toBe("header");
    const navBlock = chrome.header[0]?.blocks.find(
      (block) => block.type === "chrome_nav",
    );
    const items = navBlock?.settings.items;
    expect(Array.isArray(items)).toBe(true);
    expect((items as unknown[]).length).toBeGreaterThan(0);
    expect(chrome.footer).toHaveLength(1);
    expect(chrome.footer[0]?.type).toBe("footer");
    expect(chrome.theme_settings?.primary_color).toBe("#0369a1");
  });

  it("页头不预设按钮，页脚不预设简介与链接组", () => {
    const chrome = buildSiteStarterChrome();

    expect(
      chrome.header[0]?.blocks.some((block) => block.type === "chrome_button"),
    ).toBe(false);
    expect(
      chrome.header[0]?.blocks.some((block) => block.type === "chrome_search"),
    ).toBe(false);
    expect(
      chrome.header[0]?.blocks.some((block) => block.type === "chrome_account"),
    ).toBe(false);
    const brand = chrome.footer[0]?.blocks.find(
      (block) => block.type === "chrome_brand",
    );
    expect(brand).toBeUndefined();
    expect(
      chrome.footer[0]?.blocks.some((block) => block.type === "chrome_nav"),
    ).toBe(false);
  });
});

describe("buildSiteStarter", () => {
  it("只建首页", () => {
    expect(DEFAULT_SITE_STARTER_PAGES).toEqual([
      { presetKey: "home", sort_order: 0 },
    ]);

    const payload = buildSiteStarter("default", (key) => key, "zh-CN");
    expect(payload?.pages).toHaveLength(1);
    expect(payload?.pages[0]?.preset.kind).toBe("home");
  });

  it("首页只有三段，CTA 指向页内锚点而不是别的页面", () => {
    const payload = buildSiteStarter("default", (key) => key, "zh-CN");
    const sections = payload!.pages[0]!.sections;

    expect(sections.map((section) => section.type)).toEqual([
      "hero",
      "prose",
      "band",
    ]);
    expect(sections[1]?.settings.body_md).toContain("preset.home.prose.body_md");
    expect(sections[0]?.settings.primary_href).toBe("#contact");
    expect(sections[2]?.settings.anchor).toBe("contact");
  });
});

describe("起步首页版式", () => {
  it("不指向工作台的注册页", () => {
    const hrefs = JSON.stringify(HOME_STARTER_PRESET);
    expect(hrefs).not.toContain('"/register"');
  });
});
