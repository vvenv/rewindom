/**
 * 公开站当前页面的上下文（无 React）。
 *
 * SSR 把语言与路径写在 `.marketing-site-root` 上；贡献方的 enhance 拿到的是这份
 * 快照，不必各自去认 marketing 的 DOM 约定。
 */

import { pageLocale } from "./locale.js";

import type { AppLocale } from "@rewindom/shared";

export interface SiteEnhanceContext {
  /** 当前页面语言（`data-page-locale`，兜底 `<html lang>`）。 */
  locale: AppLocale;
  /** 当前页面站内路径（`data-page-path`，兜底 `/`）。 */
  pagePath: string;
}

export function pagePath(): string {
  const root = document.querySelector(".marketing-site-root");
  return root?.getAttribute("data-page-path") || "/";
}

export function siteEnhanceContext(): SiteEnhanceContext {
  return { locale: pageLocale(), pagePath: pagePath() };
}
