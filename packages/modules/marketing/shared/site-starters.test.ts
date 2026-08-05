import { describe, expect, it, vi } from "vitest";

import { buildSiteStarterChrome } from "./site-starters.js";

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
    expect(chrome.header[0]?.settings.show_site_nav).toBe(true);
    expect(chrome.header[0]?.blocks).toEqual([]);
    expect(chrome.footer).toHaveLength(1);
    expect(chrome.footer[0]?.type).toBe("footer");
    expect(chrome.theme_settings?.primary_color).toBe("#0369a1");
  });
});
