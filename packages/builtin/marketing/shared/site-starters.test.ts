import { describe, expect, it, vi } from "vitest";

import { HOME_STARTER_PRESET } from "./page-presets.js";
import {
  buildMinimalSiteChrome,
  buildSiteStarter,
  buildSiteStarterChrome,
  DEFAULT_SITE_STARTER_PAGES,
} from "./site-starters.js";

describe("buildMinimalSiteChrome", () => {
  it("ships default header nav and a copyright-only footer", () => {
    const chrome = buildMinimalSiteChrome("Acme");

    expect(chrome.header).toHaveLength(1);
    expect(chrome.header[0]?.type).toBe("header");
    const navBlock = chrome.header[0]?.blocks.find(
      (block) => block.type === "chrome_nav",
    );
    expect(navBlock?.settings.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "pages" })]),
    );
    expect(chrome.footer).toHaveLength(1);
    const copyright = chrome.footer[0]?.blocks.find(
      (block) => block.type === "chrome_copyright",
    );
    expect(copyright?.settings.text).toContain("Acme");
  });
});

describe("buildSiteStarterChrome", () => {
  it("builds header and footer; header ships default nav items", () => {
    const t = vi.fn((key: string) => key);
    const chrome = buildSiteStarterChrome(t);

    expect(chrome.header).toBeDefined();
    expect(chrome.footer).toBeDefined();
    if (!chrome.header || !chrome.footer) return;

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
    const chrome = buildSiteStarterChrome((key) => key);

    expect(
      chrome.header?.[0]?.blocks.some((block) => block.type === "chrome_button"),
    ).toBe(false);
    expect(
      chrome.header?.[0]?.blocks.some(
        (block) => block.type === "chrome_doc_search",
      ),
    ).toBe(false);
    expect(
      chrome.header?.[0]?.blocks.some((block) => block.type === "chrome_account"),
    ).toBe(false);
    const brand = chrome.footer?.[0]?.blocks.find(
      (block) => block.type === "chrome_brand",
    );
    expect(brand).toBeUndefined();
    expect(
      chrome.footer?.[0]?.blocks.some((block) => block.type === "menu_column"),
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
