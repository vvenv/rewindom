/**
 * 公开事件卡片 markup。feed 段与实体页共用——两处各写一份必然漂移。
 *
 * 厚卡 / 薄卡由 `evidence_text` 与 `fact_labels` 决定（与 `isThickEventCard` 同口径，
 * 文案已经在 toPublicCard 落成）。薄卡只留标题与来源；headline 不下卡片。
 * 证据是 meta 行里的角标，排在事实 chips 前面。
 */

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { sourcesLineHtml } from "../source-icon-html.js";

import type { PublicEventCard } from "../events-section-context.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export function isThickPublicCard(card: PublicEventCard): boolean {
  return Boolean(card.evidence_text) || card.fact_labels.length > 0;
}

export function eventCardHtml(
  card: PublicEventCard,
  showSources: boolean,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  const thick = isThickPublicCard(card);
  /*
   * 卡底那一行：来源 + 最后动静。
   *
   * 时间原来一个字都没上过卡片——一张事件雷达的卡片不说「什么时候」，读者没法判断
   * 这条还算不算数。`last_activity_at` 本来就在卡片数据里，只是从没渲染过。
   * 挂在来源行末尾而不是另起一行：它和来源同属「这条材料的出处与新旧」，
   * 而且薄卡（单来源、无 meta）因此终于有了第二个可读信息。
   */
  const foot = footHtml(card, showSources);

  const meta = thick
    ? [
        evidenceHtml(card.evidence_text),
        factLabelsHtml(card.fact_labels),
        momentumHtml(card),
      ]
        .filter(Boolean)
        .join("")
    : "";

  return `<li class="events-card${
    thick ? " events-card-thick" : " events-card-thin"
  }"><a class="events-card-link" href="${escapeHtml(
    siteHref(card.href, ctx),
  )}">${
    meta ? `<span class="events-meta" translate="no">${meta}</span>` : ""
  }<span class="events-title">${escapeHtml(card.title)}</span></a>${foot}</li>`;
}

function footHtml(card: PublicEventCard, showSources: boolean): string {
  const sources =
    showSources && card.source_names.length > 0
      ? sourcesLineHtml(card.source_names, card.source_icon_urls)
      : "";
  if (!card.last_activity_label) {
    return sources;
  }
  // 读者看「3 小时前」，爬虫读 datetime 里的绝对时刻——与首屏「最近更新」同一条口径
  const time = `<time class="events-card-time" datetime="${escapeHtml(
    card.last_activity_at,
  )}">${escapeHtml(card.last_activity_label)}</time>`;
  if (!sources) {
    return `<p class="events-sources events-sources-time-only">${time}</p>`;
  }
  // 塞进来源行内部，跟着一起折行；单独一个 <p> 会在窄卡上多占一行
  return sources.replace("</p>", `${time}</p>`);
}

function evidenceHtml(text: string): string {
  return text ? `<span class="events-evidence">${escapeHtml(text)}</span>` : "";
}

function factLabelsHtml(labels: readonly string[]): string {
  return labels
    .map((label) => `<span class="events-fact">${escapeHtml(label)}</span>`)
    .join("");
}

function momentumHtml(card: PublicEventCard): string {
  if (!card.momentum_label) {
    return "";
  }
  return `<span class="events-velocity${
    card.momentum_rising ? " up" : ""
  }">${escapeHtml(card.momentum_label)}</span>`;
}
