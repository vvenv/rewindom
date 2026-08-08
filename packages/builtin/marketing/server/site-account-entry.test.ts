import { afterEach, describe, expect, it } from "vitest";

import {
  createSection,
  parseSettingValues,
  getSectionDefinition,
  type SiteSection,
} from "../shared/section-schema.js";

import {
  registerSiteAccountEntry,
  resetSiteAccountEntry,
  resolveSiteAccountEntry,
} from "./site-account-entry.js";
import { renderHeaderHtml } from "./ssr-sections.js";

const ENTRY_HTML = '<a class="btn btn-ghost member-entry" href="/member/login">登录</a>';

function header(settings: Record<string, unknown>): SiteSection {
  const section = createSection("header");
  return {
    ...section,
    settings: parseSettingValues(getSectionDefinition("header").settings, {
      ...section.settings,
      ...settings,
    }),
  };
}

function renderHeader(section: SiteSection, accountEntryHtml?: string): string {
  return renderHeaderHtml({
    section,
    siteName: "站点",
    logoUrl: null,
    homeHref: "/",
    locales: [],
    accountEntryHtml,
  });
}

afterEach(() => resetSiteAccountEntry());

describe("resolveSiteAccountEntry", () => {
  it("没有模块填注入点时报「不具备」", async () => {
    await expect(
      resolveSiteAccountEntry({ tenantId: "t1", locale: "zh-CN" }),
    ).resolves.toEqual({ available: false, html: "" });
  });

  // 未绑定 Host（平台控制台等）根本没有站点，不该去问会员模块
  it("没有租户时也报「不具备」，且不调用实现", async () => {
    let calls = 0;
    registerSiteAccountEntry(async () => {
      calls += 1;
      return { available: true, html: ENTRY_HTML };
    });

    await expect(
      resolveSiteAccountEntry({ tenantId: null, locale: "zh-CN" }),
    ).resolves.toEqual({ available: false, html: "" });
    expect(calls).toBe(0);
  });

  it("填了就用填进来的那份", async () => {
    registerSiteAccountEntry(async () => ({
      available: true,
      html: ENTRY_HTML,
    }));

    await expect(
      resolveSiteAccountEntry({ tenantId: "t1", locale: "zh-CN" }),
    ).resolves.toEqual({ available: true, html: ENTRY_HTML });
  });
});

describe("renderHeaderHtml 账户入口", () => {
  /*
   * 首屏就得有它：页头是 sticky 的一行，晚出现的按钮会把右侧那一排推一下，
   * 爬虫与禁用 JS 的访客则永远看不到站点有登录入口。
   */
  it("开关打开时把入口渲染进页头", () => {
    const html = renderHeader(header({ show_account: true }), ENTRY_HTML);
    expect(html).toContain('href="/member/login"');
  });

  it("已登录菜单也能灌进页头", () => {
    const menu =
      '<details class="member-menu"><summary>Ada</summary></details>';
    const html = renderHeader(header({ show_account: true }), menu);
    expect(html).toContain("member-menu");
    expect(html).not.toContain('href="/member/login"');
  });

  it("开关关掉时不渲染", () => {
    const html = renderHeader(header({ show_account: false }), ENTRY_HTML);
    expect(html).not.toContain('href="/member/login"');
  });

  // 站点没开通会员：注入点返回空串，页头就该什么都不长
  it("没有入口 HTML 时不留空标签", () => {
    const html = renderHeader(header({ show_account: true }));
    expect(html).not.toContain("member-entry");
  });
});
