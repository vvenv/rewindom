import { afterEach, describe, expect, it } from "vitest";

import {
  createBlock,
  createSection,
  parseAreaSections,
  type SiteSection,
} from "../shared/section-schema.js";

import {
  registerSiteAccountEntry,
  resetSiteAccountEntry,
  resolveSiteAccountEntry,
} from "./site-account-entry.js";
import { renderHeaderHtml } from "./ssr-sections.js";

const ENTRY_HTML =
  '<a class="btn btn-ghost member-entry" href="/member/login">登录</a>';

function headerWithAccount(enabled: boolean): SiteSection {
  if (!enabled) return createSection("header");
  return {
    ...createSection("header"),
    blocks: [
      ...createSection("header").blocks,
      createBlock("header", "chrome_account", {}),
    ],
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
  it("有账户 block 时把入口渲染进页头", () => {
    const html = renderHeader(headerWithAccount(true), ENTRY_HTML);
    expect(html).toContain('href="/member/login"');
  });

  it("已登录菜单也能灌进页头", () => {
    const menu =
      '<details class="member-menu"><summary>Ada</summary></details>';
    const html = renderHeader(headerWithAccount(true), menu);
    expect(html).toContain("member-menu");
    expect(html).not.toContain('href="/member/login"');
  });

  it("没有账户 block 时不渲染", () => {
    const html = renderHeader(headerWithAccount(false), ENTRY_HTML);
    expect(html).not.toContain('href="/member/login"');
  });

  it("没有入口 HTML 时不留空标签", () => {
    const html = renderHeader(headerWithAccount(true));
    expect(html).not.toContain("member-entry");
  });

  /* 块经过一次读-写往返仍要认得出来（settings 里现在还多了 row / align / mobile） */
  it("存过一轮再读回来照样渲染", () => {
    const [section] = parseAreaSections("header", [
      headerWithAccount(true) as unknown as Record<string, unknown>,
    ]);
    const html = renderHeader(section!, ENTRY_HTML);
    expect(html).toContain('href="/member/login"');
  });
});
