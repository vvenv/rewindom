/**
 * 公开事件详情的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 「来源是事件的证据，不是产品主体」（MVP §13）——所以来源摊在最底下、每条都可点开核对，
 * 而不是把几个平台的榜单并排画出来。
 */

import { sortRelatedForReading } from "../events.js";
import { readEventsContext } from "../events-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { sourceIconImgHtml } from "../source-icon-html.js";

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
        siteHref(context?.index_path ?? "/", ctx),
      )}">← ${escapeHtml(backLabel)}</a>`
    : "";

  return [
    `<article class="events-detail">`,
    back,
    headerHtml(event),
    placementHtml(event, ctx),
    entitiesHtml(event, ctx),
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
    ...event.fact_labels.map(
      (label) => `<span class="events-fact">${escapeHtml(label)}</span>`,
    ),
  ].join("");
  return `<header class="events-detail-header"><span class="events-meta" translate="no">${meta}</span><h1 class="events-detail-title">${escapeHtml(
    event.title,
  )}</h1></header>`;
}

/**
 * 这条材料涉及的实体。**不给它单独的段开关**：与「归位」同一条口径——
 * 它是这条材料的身份而不是一个板块，多一个开关只会让段设置更长。
 *
 * 它还是站内通往实体页的主要入口：没有这一行，几百张实体页就只能靠 sitemap
 * 被发现，那是孤儿页。空数组（没抽到实体）时整块不渲染。
 */
function entitiesHtml(
  event: PublicEventDetailView,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  if (event.entities.length === 0) {
    return "";
  }
  const items = event.entities
    .map(
      (entity) =>
        `<li><a class="events-entity-chip" href="${escapeHtml(
          siteHref(entity.href, ctx),
        )}">${escapeHtml(entity.name)}</a></li>`,
    )
    .join("");
  return `<ul class="events-entity-chips">${items}</ul>`;
}

/**
 * 归位。**不给它单独的段开关**：它只有一到三行，属于这条材料的身份而不是一个板块，
 * 加一个 `show_placement` 只会让段设置更长，而租户没有理由单独关掉它。
 * 空数组时整块不渲染——没抽到实体、或这是它第一次出现。
 */
function placementHtml(
  event: PublicEventDetailView,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  if (event.placement.length === 0) {
    return "";
  }
  const items = event.placement
    .map((fact) => {
      const text = escapeHtml(fact.text);
      return `<li class="events-placement-item">${
        fact.href
          // 与相关事件同一条：地址要过 siteHref，否则 /en 前缀会掉
          ? `<a href="${escapeHtml(siteHref(fact.href, ctx))}">${text}</a>`
          : text
      }</li>`;
    })
    .join("");
  return `<ul class="events-placement">${items}</ul>`;
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
      const role = entry.role_label
        ? `<span class="events-timeline-role${
            entry.role === "conflict" ? " events-timeline-role-conflict" : ""
          }">${escapeHtml(entry.role_label)}</span>`
        : "";
      const icon = sourceIconImgHtml(entry.icon_url);
      const source = entry.url
        ? `<a class="events-timeline-source" href="${escapeHtml(
            entry.url,
          )}" target="_blank" rel="noreferrer noopener" translate="no">${icon}${escapeHtml(
            entry.source_name,
          )}</a>`
        : entry.source_name
          ? `<span class="events-timeline-source" translate="no">${icon}${escapeHtml(
              entry.source_name,
            )}</span>`
          : "";
      const text = `<span class="events-timeline-text">${escapeHtml(entry.label)}</span>`;
      return `<li class="events-timeline-row"><time class="events-timeline-time" datetime="${escapeHtml(
        entry.occurred_at,
      )}">${escapeHtml(time)}</time><div class="events-timeline-body">${role}${text}${source}${incidentUpdatesHtml(
        entry,
      )}</div></li>`;
    })
    .join("");
  return `<section class="events-block"><h2 class="events-block-title">${escapeHtml(
    label,
  )}</h2><ol class="events-timeline">${rows}</ol></section>`;
}

/**
 * 状态页那条 incident 的一手更新序列，嵌在它自己那一格里。
 *
 * **不拆成兄弟格**：格子的身份是信号，一次故障是一条信号，它的多次更新是这条
 * 信号的内部结构而不是多个来源。阶段词与正文都逐字取自来源，不翻译也不改写。
 */
function incidentUpdatesHtml(entry: PublicEventTimelineItem): string {
  if (entry.incident_updates.length === 0) {
    return "";
  }
  const rows = entry.incident_updates
    .map(
      (update) =>
        `<li class="events-incident-row"><time class="events-incident-time" datetime="${escapeHtml(
          update.occurred_at,
        )}">${escapeHtml(update.occurred_at.slice(11, 16))}</time><span class="events-incident-phase">${escapeHtml(
          update.phase,
        )}</span><span class="events-incident-text">${escapeHtml(update.text)}</span></li>`,
    )
    .join("");
  return `<ol class="events-incident">${rows}</ol>`;
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
              )}</a><span class="events-source-name" translate="no">${sourceIconImgHtml(item.icon_url)}${escapeHtml(item.source_name)}</span></li>`,
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
 * 先给结论与证据，再给「还牵着什么」。按时间升序排，当成连续记录读，
 * 不解释为什么相关。
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
  const items = sortRelatedForReading(event.related)
    .map((item) => {
      const date = item.last_activity_at.slice(0, 10);
      const facts = item.fact_labels
        .map((fact) => `<span class="events-fact">${escapeHtml(fact)}</span>`)
        .join("");
      return `<li class="events-related-item"><time class="events-related-date" datetime="${escapeHtml(
        item.last_activity_at,
      )}">${escapeHtml(date)}</time>${
        facts ? `<span class="events-meta" translate="no">${facts}</span>` : ""
      }<a href="${escapeHtml(siteHref(item.href, ctx))}">${escapeHtml(
        item.title,
      )}</a></li>`;
    })
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
