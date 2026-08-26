/**
 * 公开事件详情的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 「来源是事件的证据，不是产品主体」（MVP §13）——所以来源摊在最底下、每条都可点开核对，
 * 而不是把几个平台的榜单并排画出来。
 */

import { eventPublisherIconUrl, topicAccentStyle } from "../event-accent.js";
import { showsTimelineBlock, sortRelatedForReading } from "../events.js";
import { readEventsContext } from "../events-section-context.js";

import {
  escapeHtml,
  jsonLdScriptText,
} from "@rewindom/builtin/marketing/shared/html.js";
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
    jsonLdHtml(event, ctx),
    back,
    headerHtml(event),
    articleImageHtml(event),
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

/**
 * 原文插图。
 *
 * 三条约束（见 `features/event-article-image.spec.yaml`）：
 *
 * 1. **署名与回链是 markup 的一部分，不是可选装饰。** 整块是 `<figure>` +
 *    `<figcaption>`，caption 写「图：{来源名}」且外面套着指向原文的链接。
 *    带出处的链接预览是全网惯例；不带出处的大图铺在正文里就是转载。
 *    **没有来源名就不画图**——那一步在服务端就挡掉了（`article-image.ts`）。
 *
 * 2. **默认热链**出版方自己的地址：文件仍由他们托管分发，换掉或删掉就等于撤回。
 *
 * 3. **裂图回落一次，再失败整块摘掉。** 对方防盗链时 `onerror` 把 src 换成本站
 *    代理。必须**一次性**——换过就打 `data-fell-back`，第二次 `onerror` 直接
 *    移除整个 figure，否则代理也失败时同一个 src 会被无限重试。
 *
 * `referrerpolicy="no-referrer"`：不把读者所在页告诉对方（与来源 favicon 同一条）。
 * 副作用是有些站的防盗链会因此拒绝——正好走回落。
 */
function articleImageHtml(event: PublicEventDetailView): string {
  const image = event.image;
  if (!image) {
    return "";
  }
  const onError =
    "if(this.dataset.fellBack){this.closest('figure').remove()}" +
    "else{this.dataset.fellBack='1';this.src=this.dataset.fallback}";
  return `<figure class="events-figure"><img class="events-figure-img" src="${escapeHtml(
    image.url,
  )}" data-fallback="${escapeHtml(
    image.fallback_url,
  )}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="${escapeHtml(
    onError,
  )}"><figcaption class="events-figure-caption"><a href="${escapeHtml(
    image.source_href,
  )}" rel="nofollow noopener" target="_blank">${escapeHtml(
    image.credit,
  )}</a></figcaption></figure>`;
}

/**
 * 详情页题头。
 *
 * 这里曾经在上面另放一张按 slug 生成的渐变图。删掉了——那是「生成的图」，
 * 不是版面：读者从一块随机色渐变里读不出任何东西，而它占掉了首屏最贵的一块。
 *
 * 取代它的是**把题头本身做成设计对象**：主题色只作为极低饱和的底与左边一条竖线，
 * 主角是标题排版。有一手出版方时把它的标志放进来（那是真标志，不是生成物）。
 * 与卡片顶那条线同一个色相，从列表点进来时颜色是连续的。
 */
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
  const icon = eventPublisherIconUrl(event);
  const logo = icon
    ? `<span class="events-detail-logo" aria-hidden="true"><img src="${escapeHtml(
        icon,
      )}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.parentElement.remove()"></span>`
    : "";
  // 标志与角标同一行：各占一行会把题头拉成三段，中间全是空
  return `<header class="events-detail-header" style="${escapeHtml(
    topicAccentStyle(event.topic),
  )}"><span class="events-detail-eyebrow" translate="no">${logo}<span class="events-meta">${meta}</span></span><h1 class="events-detail-title">${escapeHtml(
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
          ? // 与相关事件同一条：地址要过 siteHref，否则 /en 前缀会掉
            `<a href="${escapeHtml(siteHref(fact.href, ctx))}">${text}</a>`
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
  // 一格不成线——那条信息与下面的「来源」逐字重复（见 showsTimelineBlock）
  if (!showsTimelineBlock(entries)) {
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
      const icon = sourceIconImgHtml(entry.icon_url, entry.source_name);
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
              )}</a><span class="events-source-meta"><span class="events-source-name" translate="no">${sourceIconImgHtml(
                item.icon_url,
                item.source_name,
              )}${escapeHtml(
                item.source_name,
              )}</span><time class="events-source-time" datetime="${escapeHtml(
                item.published_at,
              )}">${escapeHtml(item.published_label)}</time></span></li>`,
          )
          .join("")}</ul></div>`,
    )
    .join("");
  /*
   * 各组包一层 `.events-source-groups`：组间距原来是每组自己挂 `margin-bottom`，
   * 而外层 `.events-block` 又有 `gap`——两者叠加成 2rem，末组底下还白挂一截。
   */
  return `<section class="events-block"><h2 class="events-block-title">${escapeHtml(
    label,
  )}</h2><div class="events-source-groups">${body}</div></section>`;
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
    ? `<h2 class="events-block-title">${escapeHtml(label)}</h2>`
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
  const heading = label
    ? `<h2 class="events-block-title">${escapeHtml(label)}</h2>`
    : "";
  const items = event.why_trending
    .map((factor) => {
      const text = factor.href
        ? `<a class="events-why-cite" href="${escapeHtml(
            factor.href,
          )}" rel="noreferrer noopener" target="_blank">${escapeHtml(
            factor.text,
          )}</a>`
        : escapeHtml(factor.text);
      return `<li class="events-why-item"><span class="events-why-tag events-why-${escapeHtml(
        factor.confidence,
      )}">${escapeHtml(factor.confidence_label)}</span>${text}</li>`;
    })
    .join("");
  return `<section class="events-why">${heading}<ul>${items}</ul></section>`;
}

/**
 * 第二条 JSON-LD，只在有原文 URL 时发。marketing 头里仍是 WebPage，不改内核。
 * `{url}` 插值是 origin；页面地址 = origin + 带语言前缀的详情路径。
 */
function jsonLdHtml(
  event: PublicEventDetailView,
  ctx: Parameters<SectionHtmlRenderer>[1],
): string {
  const citations = uniqueSourceUrls(event);
  if (citations.length === 0) {
    return "";
  }
  const origin = ctx.interpolation?.url ?? "";
  const pageUrl = `${origin.replace(/\/$/, "")}${siteHref(event.href, ctx)}`;
  return `<script type="application/ld+json">${jsonLdScriptText({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: event.title,
    datePublished: event.first_seen_at,
    dateModified: event.last_activity_at,
    url: pageUrl,
    citation: citations,
    isBasedOn: citations,
  })}</script>`;
}

function uniqueSourceUrls(event: PublicEventDetailView): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const group of event.source_groups) {
    for (const item of group.items) {
      if (!item.url || seen.has(item.url)) continue;
      seen.add(item.url);
      urls.push(item.url);
    }
  }
  return urls;
}
