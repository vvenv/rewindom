/**
 * 订阅入口的 markup —— **两种落点共用一份取址逻辑**：
 *
 * - `events.subscribe-link`：页头 / 页脚的 chrome 块（站点级常驻入口）
 * - `events.subscribe`：页面段（摆在正文流里，可带一句说明）
 *
 * 与 shop 同形（`shop.cart-link` 是 chrome 块、`shop.cart` 是段）：两个落点解决
 * 两种需求，但「订阅哪个 feed」这件事只该有一份判断。
 *
 * **地址按上下文挑**：当前页有实体就给这个实体的 feed，否则给全站 feed（带上当前 topic）。
 * chrome 块也拿得到 `contributed`，所以站点级的常驻入口同样能做到
 * 「读者在哪一页，就订阅哪一页对应的东西」。
 */

import { eventsFeedPath, readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { ChromeBlockHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

const RSS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>`;

/** 当前页该订阅什么。两个渲染器共用，别各写一遍。 */
function resolveFeedHref(input: { contributed?: Readonly<Record<string, unknown>> }): string {
  const context = readEventsContext(input);
  return context?.entity
    ? context.entity.feed_href
    : eventsFeedPath(context?.listing?.topic ?? context?.topic);
}

/**
 * 页头 / 页脚的 chrome 块。
 *
 * 支持只显示图标（`icon_only`）：页头那一排寸土寸金，RSS 图标已经是通用符号。
 * **隐藏文案时必须补 `aria-label`**——只剩图标的链接对读屏软件是空的，
 * 而 `aria-hidden` 又已经把图标本身挡掉了。
 */
export const renderEventsSubscribeBlockHtml: ChromeBlockHtmlRenderer = (
  block,
  input,
) => {
  const label = settingText(block.settings, "label");
  if (!label) {
    return "";
  }

  const iconOnly = settingBool(block.settings, "icon_only");
  const href = escapeHtml(resolveFeedHref(input));
  const safeLabel = escapeHtml(label);

  return [
    `<a class="events-subscribe" href="${href}" type="application/rss+xml"`,
    ` title="${safeLabel}"`,
    iconOnly ? ` aria-label="${safeLabel}"` : "",
    `>${RSS_ICON}`,
    iconOnly ? "" : `<span>${safeLabel}</span>`,
    `</a>`,
  ].join("");
};

/**
 * 页面段。与 chrome 块的区别是它在正文流里，可以带一句说明
 *（「不需要注册账号」这种话在页脚那一排放不下）。
 */
export const renderEventsSubscribeHtml: SectionHtmlRenderer = (section, ctx) => {
  const label = settingText(section.settings, "label");
  // 没有文案就整块不渲染——与势头角标同一条口径：没有可主张的就留白
  if (!label) {
    return "";
  }

  const hint = settingText(section.settings, "hint");
  const href = escapeHtml(siteHref(resolveFeedHref(ctx), ctx));

  return [
    `<div class="events-subscribe-block">`,
    `<a class="events-subscribe" href="${href}" type="application/rss+xml">`,
    RSS_ICON,
    `<span>${escapeHtml(label)}</span></a>`,
    hint ? `<p class="events-subscribe-hint">${escapeHtml(hint)}</p>` : "",
    `</div>`,
  ]
    .filter(Boolean)
    .join("");
};
