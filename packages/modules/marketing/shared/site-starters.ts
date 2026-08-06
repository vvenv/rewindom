
import {
  buildPresetSections,
  findPagePreset,
  type PagePreset,
  type PresetTranslateFn,
} from "./page-presets.js";
import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "./section-schema.js";

import type { UpdateMarketingSiteBody } from "./site-cms.js";
import type { ThemeSettings } from "./theme-sections.js";
import type { AppLocale } from "@be-water/shared";

export interface SiteStarter {
  key: string;
  /** i18n key（`marketing` namespace） */
  label: string;
  description: string;
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

export const SITE_STARTERS: SiteStarter[] = [
  {
    key: "default",
    label: "starter.default.label",
    description: "starter.default.description",
  },
];

/**
 * 默认营销站起步模板包含的页面（主语言）：只建首页。
 *
 * 以前还顺带建了 `docs` 与 `pricing`。那是**本仓自己**的官网结构，不是通用租户的：
 * 一个做线下课程的站点拿到手，第一件事是删掉两个空文档页。想要它们的从「页面预设」
 * 里加一页即可（`PAGE_PRESETS` 里 docs / pricing / about / contact 都还在）。
 */
export const DEFAULT_SITE_STARTER_PAGES: SiteStarterPageSpec[] = [
  { presetKey: "home", sort_order: 0 },
];

/** 默认官网风格的页头 / 页脚 + 主题 token。 */
export function buildSiteStarterChrome(
  t: PresetTranslateFn,
): Pick<UpdateMarketingSiteBody, "header" | "footer" | "theme_settings"> {
  const header = createSection("header");
  const footer = createSection("footer");
  const year = new Date().getFullYear();
  const siteName = t("starter.default.site_name");

  return {
    theme_settings: {
      primary_color: "#0369a1",
      font_family: "system",
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
          // 租户新建的一级页由 `show_site_nav` 自动进顶栏，不必再抄一份 nav_link。
          show_site_nav: true,
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
  pageSpecs: SiteStarterPageSpec[] = DEFAULT_SITE_STARTER_PAGES,
): SiteStarterPayload | null {
  if (key !== "default") return null;
  const chrome = buildSiteStarterChrome(t);
  const pages: SiteStarterPayload["pages"] = [];

  for (const spec of pageSpecs) {
    const preset = findPagePreset(spec.presetKey);
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
      site_name: t("starter.default.site_name"),
      tagline: t("starter.default.tagline"),
    },
    pages,
  };
}

export function findSiteStarter(key: string): SiteStarter | undefined {
  return SITE_STARTERS.find((starter) => starter.key === key);
}
