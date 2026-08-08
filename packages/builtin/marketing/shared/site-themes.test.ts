/**
 * 主题包与多 starter。
 *
 * 守两件事：包只描述**外观**（不含品牌资产），以及每个 starter 引用的主题包与页面预设
 * 都真的存在——引用了不存在的 key，表现是新建站点少了一页或悄悄回落成默认配色。
 */

import { describe, expect, it } from "vitest";

import { findPagePreset } from "./page-presets.js";
import { buildSiteStarter, SITE_STARTERS } from "./site-starters.js";
import { findSiteTheme, SITE_THEMES } from "./site-themes.js";

/** 起步模板里的文案走 i18n key，测试里原样返回即可。 */
const t = (key: string): string => key;

describe("主题包", () => {
  it("key 唯一", () => {
    const keys = SITE_THEMES.map((theme) => theme.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("只描述外观，不含品牌资产——换配色不该把 logo 抹掉", () => {
    for (const theme of SITE_THEMES) {
      expect(theme.theme_settings).not.toHaveProperty("logo_url");
      expect(theme.theme_settings).not.toHaveProperty("og_image");
    }
  });

  it("每个包都给全了四个外观 token", () => {
    for (const theme of SITE_THEMES) {
      expect(theme.theme_settings.primary_color).toMatch(/^#/u);
      expect(theme.theme_settings.font_family).toBeDefined();
      expect(theme.theme_settings.page_width).toBeDefined();
      expect(theme.theme_settings.section_spacing).toBeGreaterThan(0);
    }
  });
});

describe("起步模板", () => {
  it.each(SITE_STARTERS)("$key 引用的主题包存在", (starter) => {
    expect(findSiteTheme(starter.themeKey)).toBeDefined();
  });

  it.each(SITE_STARTERS)("$key 引用的页面预设都存在", (starter) => {
    expect(starter.pages.length).toBeGreaterThan(0);
    for (const spec of starter.pages) {
      expect(findPagePreset(spec.presetKey), spec.presetKey).toBeDefined();
    }
  });

  it.each(SITE_STARTERS)("$key 能真的构建出来", (starter) => {
    const payload = buildSiteStarter(starter.key, t, "zh-CN");
    expect(payload).not.toBeNull();
    expect(payload!.pages).toHaveLength(starter.pages.length);
  });

  it("模板的主题 token 进到站点设置里", () => {
    const docs = buildSiteStarter("docs", t, "zh-CN");
    expect(docs!.site.theme_settings).toMatchObject(
      findSiteTheme("docs")!.theme_settings,
    );
    // 新站点还没传 logo
    expect(docs!.site.theme_settings?.logo_url).toBeNull();
  });

  it("不同模板给出不同的页面组合", () => {
    const landing = buildSiteStarter("landing", t, "zh-CN");
    const product = buildSiteStarter("product", t, "zh-CN");
    expect(landing!.pages.length).toBeLessThan(product!.pages.length);
  });

  it("不认识的 key 返回 null，而不是悄悄回落成默认模板", () => {
    expect(buildSiteStarter("nope", t, "zh-CN")).toBeNull();
  });
});
