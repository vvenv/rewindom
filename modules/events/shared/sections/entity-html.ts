/**
 * 公开实体页的 markup（SSR 与编辑器预览共用同一份）。实体页的价值在**时间尺度**——
 * 事件 24h 后就凉，实体不会，所以这一页值得被反复回访。
 *
 * 这一段只剩**事件列表**。身份（名字 h1 + 类型）与累计档案都画在 `events.entity-hero`
 * 上：一张实体名片该是名字紧跟着事实，拆成两个色块读者要跨过一句库存文案才看到数字。
 *
 * 列表标题默认为空，因此默认整段就是一个列表：这一页只有这一个列表，上面又刚说完
 * 这是谁，再挂一个「相关事件」只是把眼睛多拦一道。租户填了才画。
 */

import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { PublicEventCard } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderEventsEntityHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readEventsContext(ctx);
  const entity = context?.entity;
  // 没有当前实体（摆错了页面 / 预览没给样张）→ 整段不渲染，而不是画一块空白
  if (!entity) {
    return "";
  }

  const s = section.settings;
  const showSources = settingBool(s, "show_sources");

  const list =
    entity.events.length > 0
      ? `<ul class="events-grid">${entity.events
          .map((card) => cardHtml(card, showSources, ctx))
          .join("")}</ul>`
      : emptyHtml(settingText(s, "empty_text"));

  return [`<section class="events-entity">`, list, `</section>`]
    .filter(Boolean)
    .join("");
};

function emptyHtml(text: string): string {
  return text ? `<p class="events-empty">${escapeHtml(text)}</p>` : "";
}

/**
 * 与「正在发生什么」区块用同一套卡片类名，不另起一套样式。
 *
 * 刻意保留势头角标：实体页上「哪几件事正在扩散」和首页上一样重要，
 * 少画一个角标不会让页面更干净，只会让它更没有信息。
 */
function cardHtml(
  card: PublicEventCard,
  showSources: boolean,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  const meta = [
    `<span class="events-status events-status-${escapeHtml(card.status)}">${escapeHtml(
      card.status_label,
    )}</span>`,
    `<span class="events-topic">${escapeHtml(card.topic_label)}</span>`,
    card.momentum_label
      ? `<span class="events-velocity${
          card.momentum_rising ? " up" : ""
        }">${escapeHtml(card.momentum_label)}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const sources =
    showSources && card.source_names.length > 0
      ? `<p class="events-sources" translate="no">${escapeHtml(card.source_names.join(" · "))}</p>`
      : "";

  return `<li class="events-card"><a class="events-card-link" href="${escapeHtml(
    siteHref(card.href, ctx),
  )}"><span class="events-meta" translate="no">${meta}</span><span class="events-title">${escapeHtml(
    card.title,
  )}</span>${
    card.headline
      ? `<span class="events-headline">${escapeHtml(card.headline)}</span>`
      : ""
  }</a>${sources}</li>`;
}
