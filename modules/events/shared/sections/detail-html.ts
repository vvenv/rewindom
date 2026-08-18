/**
 * 公开事件详情的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 「来源是事件的证据，不是产品主体」（MVP §13）——所以来源摊在最底下、每条都可点开核对，
 * 而不是把几个平台的榜单并排画出来。
 */

import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type {
  PublicEventDetailView,
  PublicEventTimelineItem,
} from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderEventsDetailHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readEventsContext(ctx);
  const event = context?.event;
  // 没有当前事件（摆错了页面 / 预览没给样张）→ 整段不渲染，而不是画一块空白
  if (!event) {
    return "";
  }

  const s = section.settings;
  const backLabel = settingText(s, "back_label");
  const back = backLabel
    ? `<a class="events-back" href="${escapeHtml(
        siteHref(context?.index_path ?? "/events", ctx),
      )}">← ${escapeHtml(backLabel)}</a>`
    : "";

  return [
    `<article class="events-detail">`,
    back,
    headerHtml(event),
    summaryHtml(event, settingText(s, "summary_label")),
    settingBool(s, "show_why")
      ? whyHtml(event, settingText(s, "why_label"))
      : "",
    settingBool(s, "show_timeline")
      ? timelineHtml(event.timeline, settingText(s, "timeline_label"))
      : "",
    settingBool(s, "show_sources")
      ? sourcesHtml(event, settingText(s, "sources_label"))
      : "",
    settingBool(s, "show_related")
      ? relatedHtml(event, settingText(s, "related_label"), ctx)
      : "",
    `</article>`,
  ].join("");
};

function headerHtml(event: PublicEventDetailView): string {
  const meta = [
    `<span class="events-status events-status-${escapeHtml(event.status)}">${escapeHtml(
      event.status_label,
    )}</span>`,
    `<span class="events-topic">${escapeHtml(event.topic_label)}</span>`,
  ].join("");
  return `<header class="events-detail-header"><span class="events-meta">${meta}</span><h1 class="events-detail-title">${escapeHtml(
    event.title,
  )}</h1></header>`;
}

function summaryHtml(event: PublicEventDetailView, label: string): string {
  const body = event.summary
    ? `<p class="events-summary">${escapeHtml(event.summary)}</p>`
    : "";
  /*
   * 摘要出处必须写明：规则整理、AI 生成、机器翻译对读者的可信度各不相同。
   * 这跟工作台详情页是同一条原则，公开面更不能省。
   */
  return `<section class="events-block"><h2 class="events-block-title">${escapeHtml(
    label,
  )}</h2>${body}<p class="events-provenance">${escapeHtml(
    event.provenance_note,
  )}</p></section>`;
}

function timelineHtml(
  entries: PublicEventTimelineItem[],
  label: string,
): string {
  if (entries.length === 0) {
    return "";
  }
  const rows = entries
    .map((entry) => {
      const time = entry.occurred_at.slice(11, 16);
      const text = entry.url
        ? `<a href="${escapeHtml(entry.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(entry.label)}</a>`
        : escapeHtml(entry.label);
      return `<li class="events-timeline-row"><time class="events-timeline-time" datetime="${escapeHtml(
        entry.occurred_at,
      )}">${escapeHtml(time)}</time><span class="events-timeline-text">${text}</span></li>`;
    })
    .join("");
  return `<section class="events-block"><h2 class="events-block-title">${escapeHtml(
    label,
  )}</h2><ol class="events-timeline">${rows}</ol></section>`;
}

function sourcesHtml(event: PublicEventDetailView, label: string): string {
  const groups = event.source_groups.filter((group) => group.items.length > 0);
  if (groups.length === 0) {
    return "";
  }
  const body = groups
    .map(
      (group) =>
        `<div class="events-source-group"><h3 class="events-source-kind">${escapeHtml(
          group.label,
        )}</h3><ul class="events-source-list">${group.items
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
                item.title,
              )}</a><span class="events-source-name">${escapeHtml(item.source_name)}</span></li>`,
          )
          .join("")}</ul></div>`,
    )
    .join("");
  return `<section class="events-block"><h2 class="events-block-title">${escapeHtml(
    label,
  )}</h2>${body}</section>`;
}

/**
 * 相关事件。**不是同一件事**，只是有关系——所以摆在来源之后：
 * 先给结论与证据，再给「还牵着什么」。
 *
 * 没有相关事件（没配 embedding key、或确实没算出来）时整块不渲染，
 * 与势头角标同一条口径：没有可主张的就留白。
 */
function relatedHtml(
  event: PublicEventDetailView,
  label: string,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  if (event.related.length === 0) {
    return "";
  }
  const heading = label
    ? `<h2 class="events-related-title">${escapeHtml(label)}</h2>`
    : "";
  const items = event.related
    .map(
      (item) =>
        `<li><a href="${escapeHtml(siteHref(item.href, ctx))}">${escapeHtml(
          item.title,
        )}</a></li>`,
    )
    .join("");
  return `<section class="events-related">${heading}<ul>${items}</ul></section>`;
}

/**
 * 「为什么在扩散」。
 *
 * 只有可核对的事实，没有解释、没有动机推断（MVP §11）。
 * 每条都带 confirmed / discussion 标签——**把讨论热度当成事情本身，
 * 正是这个产品要避免的**，所以那个标签不能省。
 */
function whyHtml(event: PublicEventDetailView, label: string): string {
  if (event.why_trending.length === 0) {
    return "";
  }
  const heading = label ? `<h2 class="events-why-title">${escapeHtml(label)}</h2>` : "";
  const items = event.why_trending
    .map(
      (factor) =>
        `<li class="events-why-item"><span class="events-why-tag events-why-${escapeHtml(
          factor.confidence,
        )}">${escapeHtml(factor.confidence_label)}</span>${escapeHtml(
          factor.text,
        )}</li>`,
    )
    .join("");
  return `<section class="events-why">${heading}<ul>${items}</ul></section>`;
}
