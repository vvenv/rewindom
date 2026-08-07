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
   * 刻意**不含** `logo_url` / `og_image`：那是租户的品牌资产，不是外观风格，
   * 换主题不该把 logo 抹掉。
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
      font_family: "system",
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
      font_family: "system",
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
