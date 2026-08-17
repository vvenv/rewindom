/**
 * 公开事件页的路径处理：`/events` 与 `/events/:slug`（含 `/en/...` 前缀）。
 *
 * marketing SSR 在剥掉 locale 之后问这张表，所以两种前缀走同一套渲染。
 * 事件模块没有 cookie 要写，因此**不需要**像 shop 那样再挂一条自己的 Fastify 路由。
 */

import { normalizeLocale } from "@rewindom/module-sdk";

import { renderEventsTemplatePage } from "./events-page.js";
import {
  createEventsPresetTranslator,
  eventsMessage,
} from "./events-preset-i18n.js";
import {
  getPublicEventBySlug,
  getPublicEventFeed,
  getPublicEventList,
} from "./public-events.service.js";

import {
  EVENTS_DETAIL_PAGE_KIND,
  EVENTS_ENTITLEMENT,
  EVENTS_INDEX_PATH,
  emptyEventsContext,
  eventPath,
  isEventsIndexListing,
  isEventsPath,
  parseEventsIndexQuery,
  toPublicCard,
  toPublicDetail,
} from "../../shared/index.js";
import {
  EVENTS_DETAIL_TEMPLATE_PRESET,
  EVENTS_INDEX_PAGE_KIND,
  EVENTS_INDEX_TEMPLATE_PRESET,
  buildEventsListingSections,
} from "../../shared/events-page-templates.js";

import { registerSitePathHandler } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

import type { EventFeedTab, EventListItem, EventTopic } from "../../shared/index.js";
import type { SitePathHandlerInput } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";
import type { AppLocale } from "@rewindom/module-sdk";

function slugFromPath(path: string): string | null {
  if (path === EVENTS_INDEX_PATH) {
    return null;
  }
  return decodeURIComponent(path.slice(EVENTS_INDEX_PATH.length + 1));
}

async function renderEventsPath(
  input: SitePathHandlerInput,
): Promise<string | null> {
  if (!isEventsPath(input.path)) {
    return null;
  }

  const locale = normalizeLocale(input.locale);
  const slug = slugFromPath(input.path);

  return slug === null
    ? renderIndex(input, locale)
    : renderDetail(input, locale, slug);
}

async function renderIndex(
  input: SitePathHandlerInput,
  locale: AppLocale,
): Promise<string> {
  const query = parseEventsIndexQuery(input.query);
  if (isEventsIndexListing(query)) {
    return renderListing(input, locale, query.source, query.topic);
  }

  const feed = await getPublicEventFeed(input.tenantId);
  const t = translator(locale);

  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_INDEX_PAGE_KIND,
    path: EVENTS_INDEX_PATH,
    servedPath: input.servedPath,
    preset: EVENTS_INDEX_TEMPLATE_PRESET,
    events: emptyEventsContext({
      feed: {
        rising: feed.rising.map((item) => toCard(item, t)),
        now: feed.now.map((item) => toCard(item, t)),
      },
    }),
  });
}

async function renderListing(
  input: SitePathHandlerInput,
  locale: AppLocale,
  source: EventFeedTab,
  topic: EventTopic | undefined,
): Promise<string> {
  const items = await getPublicEventList(input.tenantId, source, topic);
  const t = translator(locale);
  const cards = items.map((item) => toCard(item, t));
  const sourceLabel = t(`sections.${source}`);
  const title = topic ? `${sourceLabel} · ${t(`topic.${topic}`)}` : sourceLabel;

  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_INDEX_PAGE_KIND,
    path: EVENTS_INDEX_PATH,
    servedPath: input.servedPath,
    preset: EVENTS_INDEX_TEMPLATE_PRESET,
    title,
    sections: buildEventsListingSections(
      source,
      topic,
      createEventsPresetTranslator(locale),
    ),
    events: emptyEventsContext({
      listing: { source, topic },
      feed: {
        rising: source === "rising" ? cards : [],
        now: source === "now" ? cards : [],
      },
    }),
  });
}

async function renderDetail(
  input: SitePathHandlerInput,
  locale: AppLocale,
  slug: string,
): Promise<string | null> {
  const detail = await getPublicEventBySlug(input.tenantId, slug);
  // 事件不存在 → 交回 404，而不是渲染一张空详情页
  if (!detail) {
    return null;
  }

  const t = translator(locale);
  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_DETAIL_PAGE_KIND,
    path: eventPath(slug),
    servedPath: input.servedPath,
    preset: EVENTS_DETAIL_TEMPLATE_PRESET,
    title: detail.title,
    description: detail.headline || undefined,
    events: emptyEventsContext({ event: toPublicDetail(detail, t) }),
  });
}

function translator(locale: AppLocale) {
  return (key: string, params?: Record<string, string | number>): string =>
    eventsMessage(locale, key, params);
}

function toCard(item: EventListItem, t: ReturnType<typeof translator>) {
  return toPublicCard(item, t);
}

export function registerEventsPathHandler(): void {
  registerSitePathHandler({
    match: isEventsPath,
    entitlement: EVENTS_ENTITLEMENT.key,
    render: renderEventsPath,
  });
}
