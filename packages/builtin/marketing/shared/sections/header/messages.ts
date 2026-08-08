/**
 * 页头交互控件的固定文案（跟随站点语言，不走工作台 i18n）。
 *
 * React `SiteChrome`、SSR `renderHeaderHtml`、site-enhance 三端共用，
 * 避免同一枚按钮在三处各写一份中文。
 */

import type { SiteColorMode } from "../../marketing-site-theme.js";
import type { AppLocale } from "@be-water/shared";

const THEME_TOGGLE_TITLE: Record<AppLocale, Record<SiteColorMode, string>> = {
  "zh-CN": {
    system: "当前主题: 跟随系统",
    dark: "当前主题: 深色",
    light: "当前主题: 浅色",
  },
  en: {
    system: "Theme: System",
    dark: "Theme: Dark",
    light: "Theme: Light",
  },
};

export function themeToggleTitle(
  locale: AppLocale,
  mode: SiteColorMode,
): string {
  return (
    THEME_TOGGLE_TITLE[locale]?.[mode] ?? THEME_TOGGLE_TITLE["zh-CN"][mode]
  );
}
