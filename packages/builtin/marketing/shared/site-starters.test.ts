import { describe, expect, it, vi } from "vitest";

import { PAGE_PRESETS } from "./page-presets.js";
import { MAIN_MENU_KEY } from "./site-menu.js";
import {
  buildSiteStarter,
  buildSiteStarterChrome,
  DEFAULT_SITE_STARTER_PAGES,
} from "./site-starters.js";

describe("buildSiteStarterChrome", () => {
  it("builds header and footer; site nav comes from top-level pages", () => {
    const t = vi.fn((key: string) => key);
    const chrome = buildSiteStarterChrome(t);

    // 返回类型来自 `UpdateMarketingSiteBody`（字段皆可选），断言窄化后再取下标
    expect(chrome.header).toBeDefined();
    expect(chrome.footer).toBeDefined();
    if (!chrome.header || !chrome.footer) return;

    expect(chrome.header).toHaveLength(1);
    expect(chrome.header[0]?.type).toBe("header");
    expect(chrome.header[0]?.settings.menu).toBe(MAIN_MENU_KEY);
    expect(chrome.header[0]?.blocks).toEqual([]);
    expect(chrome.footer).toHaveLength(1);
    expect(chrome.footer[0]?.type).toBe("footer");
    expect(chrome.theme_settings?.primary_color).toBe("#0369a1");
  });

  /*
   * 起步模板一个内链都不该带死的：`/member/register` 在未开通会员的站点上是 403，
   * 页脚链接组指向的 docs / pricing 现在也根本不会被建出来。
   */
  it("页头不预设按钮，页脚不预设链接组", () => {
    const chrome = buildSiteStarterChrome((key) => key);

    expect(chrome.header?.[0]?.settings.primary_label).toBe("");
    expect(chrome.header?.[0]?.settings.primary_href).toBe("");
    expect(chrome.header?.[0]?.settings.secondary_label).toBe("");
    expect(chrome.footer?.[0]?.blocks).toEqual([]);
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
      "feature-grid",
      "band",
    ]);
    expect(sections[1]?.blocks).toHaveLength(3);
    expect(sections[0]?.settings.primary_href).toBe("#contact");
    expect(sections[2]?.settings.anchor).toBe("contact");
  });
});

/*
 * `/register` 是**工作台的员工注册页**（`apps/client/src/shell/guest-routes.tsx`）。
 * 预设里写上它，租户站点的访客点「免费开始」会掉进 SaaS 运营方的注册表单。
 */
describe("页面预设", () => {
  it("没有任何预设指向工作台的注册页", () => {
    const hrefs = JSON.stringify(PAGE_PRESETS);
    expect(hrefs).not.toContain('"/register"');
  });
});
