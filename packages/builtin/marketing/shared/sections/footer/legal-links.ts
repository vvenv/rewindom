/**
 * 底栏那排法务链接（隐私 / 条款 / 备案号）的共用口径。
 *
 * React `SiteFooter` 与 SSR `renderFooterHtml` 共用，避免同一排链接在两端各摊平
 * 一次、各写一份中文名字。
 */

import type { ResolvedNavItem } from "../../site-nav.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 底栏是一行文字，塞不下下拉——动态项（页面目录、文档分类）一律摊平成并排的链接。
 *
 * 有子项的那条本身不是链接（口径同页头：父项只负责展开），所以取它的子项而不是
 * 它自己；不可点又没有子项的（纯分组标题）直接丢掉，底栏不该出现点不动的文字。
 */
export function flattenLegalItems(
  items: readonly ResolvedNavItem[],
): ResolvedNavItem[] {
  return items.flatMap((item) => {
    if (item.children.length > 0) return flattenLegalItems(item.children);
    return item.href ? [item] : [];
  });
}

/**
 * 这排链接的无障碍名字。
 *
 * 它和上面的链接列都是 `<nav>`，不给名字的话读屏器的 landmark 列表里会多出一条
 * 无名「导航」——同页多个同名 / 无名 landmark 等于没有 landmark（口径同页头）。
 */
const LEGAL_NAV_LABELS: Record<AppLocale, string> = {
  "zh-CN": "法务链接",
  en: "Legal",
};

export function footerLegalNavLabel(locale: AppLocale): string {
  return LEGAL_NAV_LABELS[locale] ?? LEGAL_NAV_LABELS["zh-CN"];
}
