/**
 * 租户官网画布 token：SSR 与 SPA（含编辑器预览）共用同一套中性色 / 主色映射。
 *
 * 公开站**不能**沿用工作台 `index.css` 的水蓝 `--background`；否则预览 iframe
 * 克隆宿主样式后，会和 SSR 首屏（白底 + `--accent-fg`）以及访客实站对不上。
 */

import { primaryForegroundFor } from "./site-color.js";
import {
  resolveThemeSettings,
  themeFontCss,
  themePageWidthCss,
  type ThemeSettings,
} from "./theme-sections.js";

export const MARKETING_SITE_ROOT_CLASS = "marketing-site-root";

/**
 * 访客明暗偏好的落点，**刻意不复用工作台那一套**。
 *
 * 工作台用 `next-themes`：`localStorage.theme` + `<html class="dark">`。官网与工作台
 * 同源同一个 SPA，如果站点也写这两处，访客在官网点一下深色，租户管理台下次打开就
 * 跟着变黑——那是两个受众、两套偏好，不该互相串。
 */
export const SITE_COLOR_MODE_ATTR = "data-site-color-mode";
export const SITE_COLOR_MODE_STORAGE_KEY = "site-color-mode";
export const SITE_COLOR_MODES = ["light", "dark", "system"] as const;
export type SiteColorMode = (typeof SITE_COLOR_MODES)[number];
export type ResolvedSiteColorMode = "light" | "dark";

const DEFAULT_PRIMARY = "#0f766e";

export interface MarketingCanvasPalette {
  bg: string;
  fg: string;
  mutedFg: string;
  mutedBg: string;
  border: string;
  headerBg: string;
  surface: string;
}

export interface MarketingSiteThemeTokens {
  accent: string;
  accentFg: string;
  fontFamily: string;
  pageWidth: string;
  light: MarketingCanvasPalette;
  dark: MarketingCanvasPalette;
}

function resolveCanvasPalettes(theme: ThemeSettings): {
  light: MarketingCanvasPalette;
  dark: MarketingCanvasPalette;
} {
  const bg = theme.bg_color;
  const fg = theme.fg_color;
  const lightBg = bg || "#ffffff";
  const lightFg = fg || "#0a0a0a";
  const darkBg = bg || "#0a0a0a";
  const darkFg = fg || "#fafafa";
  return {
    light: {
      bg: lightBg,
      fg: lightFg,
      mutedFg: "#737373",
      mutedBg: "#fafafa",
      border: "rgba(10,10,10,.12)",
      headerBg: "rgba(255,255,255,.85)",
      surface: "#ffffff",
    },
    dark: {
      bg: darkBg,
      fg: darkFg,
      mutedFg: "#a1a1aa",
      mutedBg: "#18181b",
      border: "rgba(250,250,250,.14)",
      headerBg: "rgba(10,10,10,.85)",
      surface: "#18181b",
    },
  };
}

/** 由站点主题设置解析画布 + 主色 token（SSR / SPA 共用）。 */
export function resolveMarketingSiteThemeTokens(
  theme_settings: unknown,
): MarketingSiteThemeTokens {
  const theme = resolveThemeSettings(theme_settings);
  const accent = theme.primary_color ?? DEFAULT_PRIMARY;
  const { light, dark } = resolveCanvasPalettes(theme);
  return {
    accent,
    accentFg: primaryForegroundFor(accent),
    fontFamily: themeFontCss(theme.font_family),
    pageWidth: themePageWidthCss(theme.page_width),
    light,
    dark,
  };
}

function paletteCssVars(
  palette: MarketingCanvasPalette,
  tokens: MarketingSiteThemeTokens,
): string {
  return `
      --site-page-width: ${tokens.pageWidth};
      --accent: ${tokens.accent};
      --accent-fg: ${tokens.accentFg};
      --site-accent: ${tokens.accent};
      --fg: ${palette.fg};
      --muted-fg: ${palette.mutedFg};
      --bg: ${palette.bg};
      --muted-bg: ${palette.mutedBg};
      --border: ${palette.border};
      --header-bg: ${palette.headerBg};
      --surface: ${palette.surface};
      --background: ${palette.bg};
      --foreground: ${palette.fg};
      --card: ${palette.surface};
      --card-foreground: ${palette.fg};
      --popover: ${palette.surface};
      --popover-foreground: ${palette.fg};
      --muted: ${palette.mutedBg};
      --muted-foreground: ${palette.mutedFg};
      --primary: ${tokens.accent};
      --primary-foreground: ${tokens.accentFg};
      --color-primary: ${tokens.accent};
      --color-primary-foreground: ${tokens.accentFg};
      --ring: ${tokens.accent};
      --input: ${palette.border};
      --secondary: ${palette.mutedBg};
      --secondary-foreground: ${palette.fg};
      --destructive: #ef4444;
      --destructive-foreground: #fff5f5;
      --radius: .75rem;
      background-color: ${palette.bg};
      color: ${palette.fg};
      font-family: ${tokens.fontFamily};`;
}

/**
 * 生成营销站根节点的 CSS 变量块。
 *
 * 三条规则的顺序与选择器是有讲究的：设备偏好那条必须写成
 * `:not([data-site-color-mode="light"])`，否则访客在深色设备上点「浅色」时，
 * `@media (prefers-color-scheme: dark)` 与基础规则同权重且排在后面，深色变量照旧
 * 生效——按钮点了跟没点一样。**显式选择必须压过设备偏好**，这是切换能用的前提。
 *
 * @param scope 根选择器；SSR 用 `:root`，SPA 注入 document 时用 `html`。
 *   明暗标记落在 `<html>` 上，所以 scope 只能是根元素选择器。
 */
export function marketingSiteThemeCss(
  theme_settings: unknown,
  scope: ":root" | "html" = ":root",
): string {
  const tokens = resolveMarketingSiteThemeTokens(theme_settings);
  const lightVars = paletteCssVars(tokens.light, tokens);
  const darkVars = paletteCssVars(tokens.dark, tokens);
  return `
    ${scope} {${lightVars}
      color-scheme: light;
    }
    @media (prefers-color-scheme: dark) {
      ${scope}:not([${SITE_COLOR_MODE_ATTR}="light"]) {${darkVars}
        color-scheme: dark;
      }
    }
    ${scope}[${SITE_COLOR_MODE_ATTR}="dark"] {${darkVars}
      color-scheme: dark;
    }`;
}

/**
 * SSR 首屏的明暗引导脚本：在样式生效前把访客偏好写到 `<html>` 上。
 *
 * 不能等 SPA 到场再补——那要等 JS 下载执行，深色设备上存了「浅色」的访客会先闪
 * 一屏黑；何况 SPA 在开发态/缺产物时压根不到场，那时静态页也得认这份偏好。
 */
export function marketingSiteColorModeScript(): string {
  const key = JSON.stringify(SITE_COLOR_MODE_STORAGE_KEY);
  const attr = JSON.stringify(SITE_COLOR_MODE_ATTR);
  return `(function(){try{var m=localStorage.getItem(${key});var d=m==="dark"||(m!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute(${attr},d?"dark":"light")}catch(e){}})()`;
}
