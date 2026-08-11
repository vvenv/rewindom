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
 * 起步模板的页头 / 页脚 + 主题 token。
 *
 * 页头页脚各模板都一样：区别在页面组合与主题包，不在 chrome 结构——真需要不同页头的
 * 那天，再给 `SiteStarter` 加一个字段，而不是现在先造一层用不上的抽象。
 */
export function buildSiteStarterChrome(
  t: PresetTranslateFn,
  themeKey = "default",
): Pick<UpdateMarketingSiteBody, "header" | "footer" | "theme_settings"> {
  /*
   * `createSection("header")` 已带上 definition 默认 `items`（一级页面 + 文档库）。
   * 这里只覆盖品牌区开关与布局，不再写独立菜单实体。
   */
  const header = createSection("header");
  const footer = createSection("footer");
  const year = new Date().getFullYear();
  const siteName = t("starter.default.site_name");

  return {
    // logo 不进主题包（那是品牌资产，不是外观风格），这里显式置空表示「还没传」
    theme_settings: {
      ...(findSiteTheme(themeKey) ?? findSiteTheme("default"))!.theme_settings,
      logo_url: null,
    } satisfies ThemeSettings,
    header: [
      {
        ...header,
        settings: parseSettingValues(getSectionDefinition("header").settings, {
          ...header.settings,
          show_logo: true,
          show_site_name: true,
          sticky: true,
          layout: "split",
          /*
           * 模板**不**配页头按钮。
           *
           * 原来这里写死 `/member/register`：会员是按租户开通的能力，默认关着，
           * 于是新站点的页头第一眼就挂着一枚点进去 403 的「免费开始」。登录 /
           * 账户入口另有 `show_account` 开关（由会员模块填内容），要 CTA 的租户
           * 自己在页头设置里加一条即可。
           */
        }),
        blocks: [],
      },
    ],
    footer: [
      {
        ...footer,
        settings: parseSettingValues(getSectionDefinition("footer").settings, {
          ...footer.settings,
          show_logo: true,
          blurb: t("starter.default.footer_blurb"),
          copyright: `© ${year} ${siteName}`,
        }),
        // 起步只建首页，页脚链接组指不到任何地址；租户加了页面再自己配
        blocks: [],
      },
    ],
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
