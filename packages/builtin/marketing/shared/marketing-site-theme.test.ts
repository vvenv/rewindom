import { describe, expect, it } from "vitest";

import {
  marketingSiteColorModeScript,
  marketingSiteThemeCss,
  resolveMarketingSiteThemeTokens,
  SITE_COLOR_MODE_ATTR,
  SITE_COLOR_MODE_STORAGE_KEY,
} from "./marketing-site-theme.js";

describe("marketing-site-theme", () => {
  it("maps theme settings to shared canvas and primary tokens", () => {
    const tokens = resolveMarketingSiteThemeTokens({
      primary_color: "#0369a1",
      bg_color: null,
      fg_color: null,
    });
    expect(tokens.accent).toBe("#0369a1");
    expect(tokens.accentFg).toBe("#ffffff");
    expect(tokens.light.bg).toBe("#ffffff");
    expect(tokens.light.fg).toBe("#0a0a0a");
  });

  it("emits shadcn-compatible variables for SPA and SSR", () => {
    const css = marketingSiteThemeCss({ primary_color: "#facc15" }, "html");
    expect(css).toContain("--accent-fg: #0a0a0a");
    expect(css).toContain("--primary-foreground: #0a0a0a");
    expect(css).toContain("--background: #ffffff");
    expect(css).toContain(`html[${SITE_COLOR_MODE_ATTR}="dark"]`);
  });

  /*
   * 深色设备上点「浅色」曾经完全无效：`@media (prefers-color-scheme: dark)` 与基础
   * 规则同权重且排在后面，深色变量照旧生效。显式选择必须能压过设备偏好。
   */
  it("lets an explicit light choice beat the device's dark preference", () => {
    const css = marketingSiteThemeCss({}, "html");
    const media = css.slice(css.indexOf("@media"));
    expect(media).toContain(`html:not([${SITE_COLOR_MODE_ATTR}="light"])`);
    expect(css.indexOf(`html[${SITE_COLOR_MODE_ATTR}="dark"]`)).toBeGreaterThan(
      css.indexOf("@media"),
    );
  });

  it("injects self-hosted @font-face only for webfonts", () => {
    expect(
      marketingSiteThemeCss({ font_family: "system" }, ":root"),
    ).not.toContain("@font-face");
    const css = marketingSiteThemeCss({ font_family: "inter" }, ":root");
    expect(css).toContain("@font-face");
    expect(css).toContain("Inter Variable");
    expect(css).toContain("/assets/site-fonts/");
    expect(css).toContain("font-family:");
  });

  it("loads a separate wordmark font without duplicating the same @font-face", () => {
    const mixed = marketingSiteThemeCss({
      font_family: "source_sans",
      brand_font_family: "newsreader",
    });
    expect(mixed).toContain("Source Sans 3 Variable");
    expect(mixed).toContain("Newsreader Variable");
    expect(mixed).toContain("--site-brand-font:");
    const same = marketingSiteThemeCss({
      font_family: "inter",
      brand_font_family: "inter",
    });
    const once = marketingSiteThemeCss({ font_family: "inter" });
    expect((same.match(/font-family: 'Inter Variable'/g) ?? []).length).toBe(
      (once.match(/font-family: 'Inter Variable'/g) ?? []).length,
    );
  });

  it("can point webfonts at an object-storage public origin", () => {
    const css = marketingSiteThemeCss({ font_family: "inter" }, ":root", {
      fontPublicDir: "https://media.example.com/platform/site-fonts",
    });
    expect(css).toContain(
      'url("https://media.example.com/platform/site-fonts/inter-latin-wght-normal-',
    );
    expect(css).not.toContain("/assets/site-fonts/");
  });

  it("bootstraps the stored visitor preference before first paint", () => {
    const script = marketingSiteColorModeScript();
    expect(script).toContain(SITE_COLOR_MODE_STORAGE_KEY);
    expect(script).toContain(SITE_COLOR_MODE_ATTR);
    // 工作台那份偏好与站点无关，绝不能读到这里来
    expect(script).not.toContain('"theme"');
    expect(script).not.toContain("</script");
  });
});
