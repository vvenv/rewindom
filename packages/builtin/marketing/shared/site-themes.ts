/**
 * 主题包 —— 一组 `theme_settings` 的预设值。
 *
 * **不是运行时的一层**：选中即写进站点的 `theme_settings`，之后租户改哪一项就是哪一项。
 * 做成运行时层（包的值 + 租户覆盖）的话，每个读 token 的地方都要处理级联，而租户改完
 * 一个颜色后「到底哪一份在生效」也说不清；写下去之后 `theme_settings` 始终是唯一真相源，
 * 「我改了主色」的行为就和它看起来的一样。
 *
 * 代价是选了新包会**覆盖**已有的微调——所以 UI 上要说清楚，而不是悄悄换掉。
 */

import type { ThemeSettings } from "./theme-sections.js";

export interface SiteTheme {
  key: string;
  /** i18n key（`marketing` namespace）。 */
  label: string;
  description: string;
  /**
   * 这个包定的 token。
   *
   * 刻意**不含** `logo_url` / `favicon_url` / `og_image`：那是站点的品牌资产，
   * 不是外观风格，换主题不该把 logo 抹掉。
   */
  theme_settings: ThemeSettings;
}

export const SITE_THEMES: SiteTheme[] = [
  {
    key: "default",
    label: "theme.default.label",
    description: "theme.default.description",
    theme_settings: {
      primary_color: "#0369a1",
      font_family: "system",
      page_width: "default",
      section_spacing: 16,
    },
  },
  {
    /** 文档 / 知识库：正文窄一档，段间距收紧，长页读起来才不散。 */
    key: "docs",
    label: "theme.docs.label",
    description: "theme.docs.description",
    theme_settings: {
      primary_color: "#0f766e",
      font_family: "source_serif",
      page_width: "compact",
      section_spacing: 8,
    },
  },
  {
    /** 落地页 / 活动页：段间距拉开，每一段都是独立的一屏。 */
    key: "bold",
    label: "theme.bold.label",
    description: "theme.bold.description",
    theme_settings: {
      primary_color: "#c026d3",
      font_family: "inter",
      page_width: "wide",
      section_spacing: 40,
    },
  },
  {
    /** 极简：去掉主色的存在感，靠留白与字重区分层次。 */
    key: "minimal",
    label: "theme.minimal.label",
    description: "theme.minimal.description",
    theme_settings: {
      primary_color: "#18181b",
      font_family: "serif",
      page_width: "default",
      section_spacing: 24,
    },
  },
];

export function findSiteTheme(key: string): SiteTheme | undefined {
  return SITE_THEMES.find((theme) => theme.key === key);
}

/**
 * 把一个包盖到现有 token 上。
 *
 * 品牌资产（logo / 分享图）穿过主题切换活下来——包里本来就没有这两项，但 `current` 里
 * 有，展开顺序一写反就被 `undefined` 顶掉了，所以显式写回来。
 *
 * 服务端的 `POST /site/themes/:key/apply` 与站点设置里的主题选择器共用这一份语义：
 * 一个直接落库、一个先改草稿等保存，覆盖哪些项必须是同一个答案。
 */
export function applySiteThemeSettings(
  current: ThemeSettings,
  theme: SiteTheme,
): ThemeSettings {
  return {
    ...current,
    ...theme.theme_settings,
    logo_url: current.logo_url,
    favicon_url: current.favicon_url,
    og_image: current.og_image,
  };
}
