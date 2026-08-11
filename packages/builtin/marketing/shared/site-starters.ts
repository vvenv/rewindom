import {
  buildPresetSections,
  findStarterPagePreset,
  type PagePreset,
  type PresetTranslateFn,
} from "./page-presets.js";
import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "./section-schema.js";
import { findSiteTheme } from "./site-themes.js";

import type { UpdateMarketingSiteBody } from "./site-cms.js";
import type { ThemeSettings } from "./theme-sections.js";
import type { AppLocale } from "@be-water/shared";

export interface SiteStarter {
  key: string;
  /** i18n key（`marketing` namespace） */
  label: string;
  description: string;
  /** 用哪个主题包（`SITE_THEMES` 的 key）。 */
  themeKey: string;
  /** 建哪几页。空数组不合法——一个建不出任何页面的模板没有意义。 */
  pages: SiteStarterPageSpec[];
}

export interface SiteStarterPageSpec {
  presetKey: string;
  sort_order: number;
}

export interface SiteStarterPayload {
  site: UpdateMarketingSiteBody;
  pages: Array<{
    preset: PagePreset;
    sections: SiteSection[];
    sort_order: number;
  }>;
}

/**
 * 起步模板 = **主题包 + 页面组合**。
 *
 * 一个模板就是「这类站点开局长什么样」：默认只铺一张三段式首页。
 */
export const SITE_STARTERS: SiteStarter[] = [
  {
    key: "default",
    label: "starter.default.label",
    description: "starter.default.description",
    themeKey: "default",
    pages: [{ presetKey: "home", sort_order: 0 }],
  },
];

/**
 * 默认营销站起步模板包含的页面（主语言）：只建首页。
 *
 * `/docs` 是租户文档库（`MarketingDoc`）的专属路径，不由页面预设生成。
 */
export const DEFAULT_SITE_STARTER_PAGES: SiteStarterPageSpec[] = [
  { presetKey: "home", sort_order: 0 },
];

/**
 * 最简页头页脚：definition 默认页头 + 一行版权页脚。
 *
 * 建站、起步模板、页头页脚编辑器的空状态都走这一套，避免各处各写一份。
 */
export function buildMinimalSiteChrome(
  siteName: string,
): Pick<UpdateMarketingSiteBody, "header" | "footer"> {
  const header = createSection("header");
  const footer = createSection("footer");
  const footerDef = getSectionDefinition("footer");
  if (!footerDef) {
    throw new Error("Missing footer section definition");
  }
  const year = new Date().getFullYear();

  return {
    header: [header],
    footer: [
      {
        ...footer,
        settings: parseSettingValues(footerDef.settings, {
          ...footer.settings,
          copyright: `© ${year} ${siteName}`,
        }),
        blocks: [],
      },
    ],
  };
}

/**
 * 起步模板的页头 / 页脚 + 主题 token。
 *
 * 页头页脚各模板都一样：区别在页面组合与主题包，不在 chrome 结构——真需要不同页头的
 * 那天，再给 `SiteStarter` 加一个字段，而不是现在先造一层用不上的抽象。
 *
 * 默认内容刻意极简：`createSection` 的 definition 默认（Logo + 站名 + 一级页面导航；
 * 页脚只留一行版权），不预填按钮、简介、链接列或文档入口。
 */
export function buildSiteStarterChrome(
  t: PresetTranslateFn,
  themeKey = "default",
): Pick<UpdateMarketingSiteBody, "header" | "footer" | "theme_settings"> {
  const chrome = buildMinimalSiteChrome(t("starter.default.site_name"));

  return {
    // logo 不进主题包（那是品牌资产，不是外观风格），这里显式置空表示「还没传」
    theme_settings: {
      ...(findSiteTheme(themeKey) ?? findSiteTheme("default"))!.theme_settings,
      logo_url: null,
    } satisfies ThemeSettings,
    ...chrome,
  };
}

export function buildSiteStarter(
  key: string,
  t: PresetTranslateFn,
  _defaultLocale: AppLocale,
  /** 覆盖模板自带的页面组合（测试与「只建首页」的引导流程用）。 */
  pageSpecs?: SiteStarterPageSpec[],
): SiteStarterPayload | null {
  const starter = findSiteStarter(key);
  if (!starter) return null;
  const chrome = buildSiteStarterChrome(t, starter.themeKey);
  const pages: SiteStarterPayload["pages"] = [];

  for (const spec of pageSpecs ?? starter.pages) {
    const preset = findStarterPagePreset(spec.presetKey);
    if (!preset) continue;
    pages.push({
      preset,
      sections: buildPresetSections(preset, t),
      sort_order: spec.sort_order,
    });
  }

  if (pages.length === 0) return null;

  return {
    site: {
      ...chrome,
      // 站名 / 标语各模板共用一份占位文案：租户开局第一件事就是改掉它
      site_name: t("starter.default.site_name"),
      tagline: t("starter.default.tagline"),
    },
    pages,
  };
}

export function findSiteStarter(key: string): SiteStarter | undefined {
  return SITE_STARTERS.find((starter) => starter.key === key);
}
