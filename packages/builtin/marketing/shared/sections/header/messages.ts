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

/**
 * 导航区的无障碍名字。
 *
 * 一个页面上有好几个 `<nav>`（页头一条、窄屏那条、页脚每列各一条），读屏器的
 * landmark 列表里全叫「导航」的话，跳过去之前根本分不出哪条是哪条——多个同名
 * landmark 等于没有 landmark。窄屏那条与页头是同一份链接的两种排版，所以标注成
 * 「移动端」而不是再叫一次「主导航」。
 */
const NAV_LABELS: Record<AppLocale, { main: string; mobile: string }> = {
  "zh-CN": { main: "主导航", mobile: "主导航（移动端）" },
  en: { main: "Main", mobile: "Main (mobile)" },
};

export function headerNavLabel(
  locale: AppLocale,
  variant: "main" | "mobile" = "main",
): string {
  return NAV_LABELS[locale]?.[variant] ?? NAV_LABELS["zh-CN"][variant];
}
