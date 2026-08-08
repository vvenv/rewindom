import { describe, expect, it } from "vitest";

import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "../../section-schema.js";

import { renderHeaderHtml } from "./html.js";

import type { AppLocale } from "@be-water/shared";

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

function renderHeader(locale?: AppLocale): string {
  return renderHeaderHtml({
    section: header({ show_theme_toggle: true }),
    siteName: "站点",
    logoUrl: null,
    homeHref: "/",
    locales: [],
    locale,
  });
}

describe("renderHeaderHtml 明暗按钮", () => {
  it("按页面语言渲染 title", () => {
    expect(renderHeader("zh-CN")).toContain('title="当前主题: 跟随系统"');
    expect(renderHeader("en")).toContain('title="Theme: System"');
  });

  // 预览等场景不传 locale，别把 title 渲染成 undefined
  it("没有 locale 时回落到中文", () => {
    expect(renderHeader()).toContain('title="当前主题: 跟随系统"');
  });
});
