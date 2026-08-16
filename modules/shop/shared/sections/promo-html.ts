/**
 * 优惠码公告条的 markup（SSR 与编辑器预览共用）。
 *
 * 没有可推的码 → 返回空串，整段不渲染。码是**展示**用的，买家仍得在购物车 / 结账
 * 手填——公告条不代表已经应用。
 */

import { fillShopPromoText } from "../promo.js";
import { readShopContext } from "../shop-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderPromoHtml: SectionHtmlRenderer = (section, ctx) => {
  const promo = readShopContext(ctx)?.promo;
  if (!promo) return "";
  const s = section.settings;
  const text = fillShopPromoText(settingText(s, "text"), promo);
  if (!text.trim()) return "";
  const align = settingText(s, "align") === "left" ? " left" : "";
  const href = settingText(s, "href");
  const body = `<span class="shop-promo-text">${escapeHtml(text)}</span><code class="shop-promo-code">${escapeHtml(promo.code)}</code>`;
  return `<div class="shop-promo${align}">${
    href
      ? `<a class="shop-promo-link" href="${escapeHtml(siteHref(href, ctx))}">${body}</a>`
      : body
  }</div>`;
};
