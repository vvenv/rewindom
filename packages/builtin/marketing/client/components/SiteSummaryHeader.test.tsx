import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MARKETING_I18N } from "../i18n.js";

import { SiteSummaryHeader } from "./SiteSummaryHeader.js";

import type { MarketingSite } from "../../shared/site-cms.js";

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const site = {
  id: "site-1",
  site_name: "Acme",
  tagline: "",
  logo_url: null,
  primary_color: null,
  theme_settings: {},
  default_locale: "zh-CN",
  header: [],
  footer: [],
  chrome_dirty: false,
  published: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} as unknown as MarketingSite;

/** `canWrite={false}`：起步模板与设置抽屉自带数据请求，计数这一行与它们无关。 */
function renderHeader(summary?: {
  total: number;
  published: number;
  dirty: number;
}) {
  return render(
    <SiteSummaryHeader
      site={site}
      defaultLocale="zh-CN"
      isLoading={false}
      canWrite={false}
      hasStarterContent={false}
      summary={summary}
    />,
  );
}

describe("SiteSummaryHeader", () => {
  it("fills the counts in (interpolation names must match the catalog)", () => {
    renderHeader({ total: 5, published: 3, dirty: 2 });

    expect(screen.getByText("5 个页面")).toBeInTheDocument();
    expect(screen.getByText("3 个已发布")).toBeInTheDocument();
    expect(screen.getByText("2 个有改动未发布")).toBeInTheDocument();
  });

  it("hides the dirty count when nothing is waiting to be published", () => {
    renderHeader({ total: 5, published: 5, dirty: 0 });

    // 恒定的「0 个待发布」是噪音，它只在真有待办时出现
    expect(screen.queryByText(/有改动未发布/)).toBeNull();
  });

  it("draws no counts before the page list has loaded", () => {
    renderHeader();

    expect(screen.queryByText(/个页面/)).toBeNull();
  });
});
