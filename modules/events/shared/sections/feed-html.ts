/**
 * 「正在发生什么」区块的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 卡片恒指向站内详情页——开通事件雷达就一定有公开详情页
 *（模板页与 path handler 一起登记），不会把访客直接甩去站外。
 * 卡片恒指向站内详情页 `/events/:slug`。
 */

import {
  EVENTS_BRIEFING_SECTION_TYPE,
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_RISING_SECTION_TYPE,
} from "../events-feed-section.js";
import {
  eventsIndexHref,
  readEventsContext,
} from "../events-section-context.js";
import { isEventTopic, parseEventFeedTab } from "../events.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { eventCardHtml } from "./event-card-html.js";

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
 * 默认版式把 Briefing / Rising / Now 摆在同一张页面上，而各段的取数是各自独立的
 * ——一个又热又有证据的事件会同时命中简报与 Now，页面上就出现两张一模一样的卡片。
 *
 * 去重刻意**不做在取数层**：那样「只摆 Now 一段」的页面会莫名少掉最热的那几条。
 * 放在渲染层则是「先来先得」：一段单独摆时拿到完整列表，两段同页时后面的自动让开。
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

function feedSourceFromSection(section: {
  type: string;
  settings: Parameters<typeof settingText>[0];
}): EventFeedTab {
  if (section.type === EVENTS_NOW_SECTION_TYPE) {
    return "now";
  }
  if (section.type === EVENTS_RISING_SECTION_TYPE) {
    return "rising";
  }
  return parseEventFeedTab(settingText(section.settings, "source")) ?? "rising";
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

  if (section.type === EVENTS_BRIEFING_SECTION_TYPE) {
    return renderBriefingHtml(section, ctx, context);
  }

  const source = feedSourceFromSection(section);
  const sectionTopic = feedTopic(settingText(s, "topic"));
  const topic = sectionTopic ?? context?.topic;
  const limit = settingNumber(s, "limit", 6);
  const showSources = settingBool(s, "show_sources");
  const listing = isListingFor(context?.listing, source, sectionTopic);

  const bucket =
    source === "now" ? (context?.feed.now ?? []) : (context?.feed.rising ?? []);
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
          siteHref(
            eventsIndexHref(
              { source, topic },
            ),
            ctx,
          ),
        )}">${escapeHtml(moreLabel)}</a>`
      : "";

  return `<div class="events-feed">${header}<ul class="events-grid">${cards
    .map((card) => eventCardHtml(card, showSources, ctx))
    .join("")}</ul>${more}</div>`;
};

/**
 * 简报：空则整段不渲染。查看全部永远链到 Now 列表，不新造 ?source=briefing。
 */
function renderBriefingHtml(
  section: Parameters<SectionHtmlRenderer>[0],
  ctx: Parameters<SectionHtmlRenderer>[1],
  context: EventsRenderContext | null,
): string {
  const s = section.settings;
  const sectionTopic = feedTopic(settingText(s, "topic"));
  const topic = sectionTopic ?? context?.topic;
  const limit = settingNumber(s, "limit", 4);
  const showSources = settingBool(s, "show_sources");
  const bucket = context?.feed.briefing ?? [];
  const all = topic ? bucket.filter((card) => card.topic === topic) : bucket;
  const cards = takeUnseen(context, all, limit);
  if (cards.length === 0) {
    return "";
  }

  const header = sectionHeading(s);
  const moreLabel = settingText(s, "more_label");
  const more = moreLabel
    ? `<a class="events-more" href="${escapeHtml(
        siteHref(eventsIndexHref({ source: "now", topic }), ctx),
      )}">${escapeHtml(moreLabel)}</a>`
    : "";

  return `<div class="events-feed">${header}<ul class="events-grid">${cards
    .map((card) => eventCardHtml(card, showSources, ctx))
    .join("")}</ul>${more}</div>`;
}
