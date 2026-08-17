/**
 * 「正在发生什么」区块的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 卡片恒指向站内 `/events/:slug`——开通事件雷达就一定有公开详情页
 *（模板页与 path handler 一起登记），不会把访客直接甩去站外。
 */

import {
  eventsIndexHref,
  readEventsContext,
} from "../events-section-context.js";
import { isEventFeedTab, isEventTopic } from "../events.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type {
  EventsIndexQuery,
  EventsRenderContext,
  PublicEventCard,
} from "../events-section-context.js";
import type { EventFeedTab, EventTopic } from "../events.js";
import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 同一页上已经出现过的事件（按上下文对象分桶）。
 *
 * 默认版式把 Rising / Now / Today 三段摆在同一张页面上，而三段的取数是各自独立的
 * ——一个又热又在升温的事件会同时命中三段，页面上就出现三张一模一样的卡片。
 *
 * 去重刻意**不做在取数层**：那样「只摆 Today 一段」的页面会莫名少掉最热的那几条。
 * 放在渲染层则是「先来先得」：一段单独摆时拿到完整列表，三段同页时后面的自动让开。
 *
 * 用 WeakMap 按上下文对象分桶 = 天然按请求隔离（上下文每次渲染新建一个），
 * 也不必把可变状态塞进要跨端传递的上下文形状里。
 */
const SEEN_BY_CONTEXT = new WeakMap<EventsRenderContext, Set<string>>();

function takeUnseen(
  context: EventsRenderContext | null,
  cards: PublicEventCard[],
  limit: number,
): PublicEventCard[] {
  if (!context) {
    return cards.slice(0, limit);
  }
  let seen = SEEN_BY_CONTEXT.get(context);
  if (!seen) {
    seen = new Set();
    SEEN_BY_CONTEXT.set(context, seen);
  }

  const picked: PublicEventCard[] = [];
  for (const card of cards) {
    if (picked.length >= limit) {
      break;
    }
    if (seen.has(card.slug)) {
      continue;
    }
    seen.add(card.slug);
    picked.push(card);
  }
  return picked;
}

function feedSource(value: string): EventFeedTab {
  return isEventFeedTab(value) ? value : "rising";
}

function feedTopic(value: string): EventTopic | undefined {
  return isEventTopic(value) ? value : undefined;
}

function isListingFor(
  listing: EventsIndexQuery | undefined,
  source: EventFeedTab,
  topic: EventTopic | undefined,
): boolean {
  return listing?.source === source && listing.topic === topic;
}

export const renderEventsFeedHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readEventsContext(ctx);
  const s = section.settings;

  const source = feedSource(settingText(s, "source"));
  const topic = feedTopic(settingText(s, "topic"));
  const limit = settingNumber(s, "limit", 6);
  const showSources = settingBool(s, "show_sources");
  const listing = isListingFor(context?.listing, source, topic);

  const bucket =
    source === "now"
      ? (context?.feed.now ?? [])
      : source === "today"
        ? (context?.feed.today ?? [])
        : (context?.feed.rising ?? []);
  const all = topic ? bucket.filter((card) => card.topic === topic) : bucket;
  const cards = takeUnseen(context, all, listing ? all.length : limit);
  const header = sectionHeading(s);

  if (cards.length === 0) {
    const empty = settingText(s, "empty_text");
    return `<div class="events-feed">${header}${
      empty ? `<p class="events-empty">${escapeHtml(empty)}</p>` : ""
    }</div>`;
  }

  const moreLabel = settingText(s, "more_label");
  const more =
    !listing && moreLabel
      ? `<a class="events-more" href="${escapeHtml(
          siteHref(eventsIndexHref({ source, topic }), ctx),
        )}">${escapeHtml(moreLabel)}</a>`
      : "";

  return `<div class="events-feed">${header}<ul class="events-grid">${cards
    .map((card) => cardHtml(card, showSources, ctx))
    .join("")}</ul>${more}</div>`;
};

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
    velocityHtml(card.velocity_pct),
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

/**
 * 增速标记。产品主指标是「它正在变化」而不是「它排第几」（MVP §2），
 * 所以这里只有涨跌幅，没有名次也没有绝对热度分。
 */
function velocityHtml(velocityPct: number): string {
  if (Math.abs(velocityPct) < 5) {
    return "";
  }
  const rising = velocityPct > 0;
  const percent = Math.round(Math.abs(velocityPct));
  return `<span class="events-velocity${rising ? " up" : ""}">${
    rising ? "↑" : "↓"
  } ${percent}%</span>`;
}
