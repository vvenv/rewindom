/**
 * 公开实体页的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 只有两块：这是谁 → 它涉及的事件。实体页的价值在**时间尺度**——
 * 事件 24h 后就凉，实体不会，所以这一页值得被反复回访。
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
  const eventsLabel = settingText(s, "events_label");
  const showSources = settingBool(s, "show_sources");

  const list =
    entity.events.length > 0
      ? `<ul class="events-grid">${entity.events
          .map((card) => cardHtml(card, showSources, ctx))
          .join("")}</ul>`
      : emptyHtml(settingText(s, "empty_text"));

  return [
    `<section class="events-entity">`,
    `<header class="events-entity-head">`,
    `<h1 class="events-entity-name">${escapeHtml(entity.name)}</h1>`,
    `<p class="events-entity-meta">${escapeHtml(entity.kind_label)}</p>`,
    `</header>`,
    eventsLabel
      ? `<h2 class="events-entity-section-title">${escapeHtml(eventsLabel)}</h2>`
      : "",
    list,
    `</section>`,
  ]
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
      ? `<p class="events-sources">${escapeHtml(card.source_names.join(" · "))}</p>`
      : "";

  return `<li class="events-card"><a class="events-card-link" href="${escapeHtml(
    siteHref(card.href, ctx),
  )}"><span class="events-meta">${meta}</span><span class="events-title">${escapeHtml(
    card.title,
  )}</span>${
    card.headline
      ? `<span class="events-headline">${escapeHtml(card.headline)}</span>`
      : ""
  }</a>${sources}</li>`;
}
