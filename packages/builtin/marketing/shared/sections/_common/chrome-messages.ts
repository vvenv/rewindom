/**
 * 页头 / 页脚控件的固定文案（跟随站点语言，不走工作台 i18n）。
 *
 * React `SiteChrome`、SSR `chrome-html.ts`、site-enhance 三端共用，避免同一枚按钮
 * 在三处各写一份中文。
 */

import type { SiteColorMode } from "../../marketing-site-theme.js";
import type { AppLocale } from "@rewindom/shared";

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

/**
 * 没填标题的导航块的无障碍名字。
 *
 * 一个页面上有好几个 `<nav>`（页头一条、页脚每列各一条、底栏法务链接一条），读屏器的
 * landmark 列表里全叫「导航」的话，跳过去之前根本分不出哪条是哪条——多个同名 landmark
 * 等于没有 landmark。所以：**填了标题就用标题**，没填就退回 `<div>`，不制造无名 landmark。
 * 只有页头第一条导航例外，它天然是「主导航」。
 */
const CHROME_LABELS: Record<AppLocale, { mainNav: string; menu: string }> = {
  "zh-CN": { mainNav: "主导航", menu: "菜单" },
  en: { mainNav: "Main", menu: "Menu" },
};

export function mainNavLabel(locale: AppLocale): string {
  return CHROME_LABELS[locale]?.mainNav ?? CHROME_LABELS["zh-CN"].mainNav;
}

export function chromeMenuLabel(locale: AppLocale): string {
  return CHROME_LABELS[locale]?.menu ?? CHROME_LABELS["zh-CN"].menu;
}
