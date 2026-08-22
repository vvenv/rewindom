/**
 * 「正在发生什么」区块的 markup（SSR 与编辑器预览共用同一份）。
 *
 * 卡片恒指向站内详情页——开通事件雷达就一定有公开详情页
 *（模板页与 path handler 一起登记），不会把访客直接甩去站外。
 * 卡片恒指向站内详情页 `/events/:slug`。
 */

import { cardsForEventFeedSection } from "../allocate-event-feed.js";
import {
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

function listingCards(
  context: EventsRenderContext | null,
  source: EventFeedTab,
  topic: EventTopic | undefined,
): PublicEventCard[] {
  const bucket =
    source === "now" ? (context?.feed.now ?? []) : (context?.feed.rising ?? []);
  return topic ? bucket.filter((card) => card.topic === topic) : bucket;
}

function sectionCards(
  section: Parameters<SectionHtmlRenderer>[0],
  ctx: Parameters<SectionHtmlRenderer>[1],
  context: EventsRenderContext | null,
): PublicEventCard[] {
  return cardsForEventFeedSection(
    section,
    ctx.pageSections,
    {
      rising: context?.feed.rising ?? [],
      now: context?.feed.now ?? [],
    },
    context?.topic,
  );
}

export const renderEventsFeedHtml: SectionHtmlRenderer = (section, ctx) => {
  const context = readEventsContext(ctx);
  const s = section.settings;

  const source = feedSourceFromSection(section);
  const sectionTopic = feedTopic(settingText(s, "topic"));
  const topic = sectionTopic ?? context?.topic;
  const showSources = settingBool(s, "show_sources");
  const listing = isListingFor(context?.listing, source, sectionTopic);
  const cards = listing
    ? listingCards(context, source, topic)
    : sectionCards(section, ctx, context);
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
