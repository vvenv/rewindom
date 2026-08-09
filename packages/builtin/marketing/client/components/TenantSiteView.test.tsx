import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { SITE_COLOR_MODE_ATTR } from "../../shared/marketing-site-theme.js";
import { parseAreaSections } from "../../shared/section-schema.js";
import { resolveThemeSettings } from "../../shared/theme-sections.js";

import { TenantSiteView } from "./TenantSiteView.js";

import type { PublicMarketingSite } from "../../shared/site-cms.js";

function site(headerSettings: Record<string, unknown> = {}): PublicMarketingSite {
  return {
    site_name: "Acme",
    tagline: "",
    logo_url: null,
    primary_color: null,
    theme_settings: resolveThemeSettings({}),
    menus: [],
    default_locale: "zh-CN",
    locale: "zh-CN",
    available_locales: ["zh-CN"],
    header: parseAreaSections("header", [
      { type: "header", settings: headerSettings, blocks: [] },
    ]),
    footer: parseAreaSections("footer", [
      { type: "footer", settings: {}, blocks: [] },
    ]),
    pages: [],
  };
}

function renderSite(headerSettings: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <TenantSiteView site={site(headerSettings)} path="/" />
    </MemoryRouter>,
  );
}

describe("TenantSiteView 页面外壳", () => {
  /*
   * 页头曾经被再套一层 `<header>`：外层高度恰好等于页头本身，`position: sticky`
   * 没有任何可粘的余量，「吸顶」开关在 SPA 接管后就失效了（SSR 首屏还能吸，
   * 因为那边页头直接摊在 `.site-stack` 下）。
   */
  it("吸顶页头直接挂在 site-stack 上，不再套一层等高 wrapper", () => {
    const { container } = renderSite({ sticky: true });

    const header = container.querySelector("header.site-header");
    expect(header).not.toBeNull();
    expect(header!.classList.contains("sticky")).toBe(true);
    expect(header!.parentElement?.classList.contains("site-stack")).toBe(true);
    expect(header!.parentElement?.tagName).not.toBe("HEADER");
    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(
      container.querySelector(`.marketing-site-root main.site-main`),
    ).not.toBeNull();
  });

  it("关掉吸顶就不给 sticky class", () => {
    const { container } = renderSite({ sticky: false });
    expect(
      container.querySelector("header.site-header")?.classList.contains("sticky"),
    ).toBe(false);
  });

  it("页脚同样不嵌套 landmark", () => {
    const { container } = renderSite();
    const footer = container.querySelector("footer.site-footer");
    expect(footer).not.toBeNull();
    expect(footer!.parentElement?.tagName).not.toBe("FOOTER");
    expect(container.querySelectorAll("footer")).toHaveLength(1);
  });

  /* 访客明暗落在站点自己的标记上，工作台的 `.dark` / `localStorage.theme` 不参与。 */
  it("把访客明暗打在 document 上，且不碰工作台那份偏好", () => {
    localStorage.setItem("theme", "dark");
    renderSite();

    expect(
      document.documentElement.getAttribute(SITE_COLOR_MODE_ATTR),
    ).toMatch(/^(light|dark)$/u);
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    localStorage.removeItem("theme");
  });
});
