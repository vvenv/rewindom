import { registerI18nBundles, setupI18n } from "@be-water/client-kit";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
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
  theme_key: null,
  default_locale: "zh-CN",
  header: [],
  footer: [],
  site_draft_dirty: false,
  published: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
} as unknown as MarketingSite;

/**
 * `canWrite={false}`：起步模板那颗自带数据请求，计数这一行与它无关。
 * 只读下仍会渲染站点设置与页头页脚两颗 `<Link>`，所以要套一层 router。
 */
function renderHeader(summary?: {
  total: number;
  published: number;
  dirty: number;
}) {
  return render(
    <MemoryRouter>
      <SiteSummaryHeader
        site={site}
        defaultLocale="zh-CN"
        isLoading={false}
        canWrite={false}
        hasStarterContent={false}
        summary={summary}
      />
    </MemoryRouter>,
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

  // 只读也该能看官网，所以入口不在 canWrite 分支里
  it("offers a new-window entrance to the live site without write permission", () => {
    renderHeader();

    const link = screen.getByRole("link", { name: "查看官网" });
    expect(link).toHaveAttribute("href", "/");
    expect(link).toHaveAttribute("target", "_blank");
  });

  /*
   * 页头页脚编辑器自己按 `site.write` 逐个禁用操作，只读的人进去能看不能改；左侧
   * 导航那条也只要 `site.read`。卡片上这颗曾锁在 canWrite 里，于是只读的人从菜单
   * 进得去、从卡片进不去。
   */
  it("keeps the header & footer entrance reachable without write permission", () => {
    renderHeader();

    expect(screen.getByRole("link", { name: "页头页脚" })).toHaveAttribute(
      "href",
      "/app/site/editor",
    );
  });
});
