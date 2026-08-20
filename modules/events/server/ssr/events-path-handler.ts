/**
 * 公开事件页的路径处理：`/topics/:slug`、`/events/:slug`、`/entities`、
 * `/feed.xml`（含 `/en/...` 前缀，locale 已被剥掉）。
 *
 * `/` 由首页 CMS 渲染；套了雷达版式时 `/?source=` 由本 handler 接管列表。
 * 事件模块没有 cookie 要写，因此不需要像 shop 那样再挂一条自己的 Fastify 路由。
 */

import { normalizeLocale } from "@rewindom/module-sdk";

import { renderEventsTemplatePage } from "./events-page.js";
import { isEventOgImageAvailable } from "./og-image.js";
import { renderEventOgImage } from "./og.render.js";
import { renderEntityFeed, renderEventsFeed } from "./rss.render.js";
import {
  createEventsPresetTranslator,
  eventsMessage,
} from "./events-preset-i18n.js";
import {
  getPublicEntityBySlug,
  getPublicEntityIndex,
  getPublicEventBySlug,
  getPublicEventFeed,
  getPublicEventList,
  getPublicHeroStats,
} from "./public-events.service.js";
import { getEnabledTopics } from "../event/topic-settings.service.js";

import {
  EVENTS_DETAIL_PAGE_KIND,
  EVENTS_ENTITLEMENT,
  EVENTS_ENTITY_INDEX_PAGE_KIND,
  EVENTS_ENTITY_PAGE_KIND,
  emptyEventsContext,
  entityIndexPath,
  entityPath,
  eventOgImagePath,
  eventPath,
  eventsHubPath,
  isEventsIndexListing,
  isEventsPath,
  isEventsRootQueryTakeover,
  isTopicEnabled,
  parseEventsIndexQuery,
  parseEventsPublicPath,
  topicPath,
  toPublicCard,
  toPublicDetail,
  toPublicEntity,
  toPublicEntityIndex,
  toPublicEntityStrip,
  toPublicHero,
} from "../../shared/index.js";
import {
  EVENTS_DETAIL_TEMPLATE_PRESET,
  EVENTS_ENTITY_INDEX_TEMPLATE_PRESET,
  EVENTS_ENTITY_TEMPLATE_PRESET,
  EVENTS_TOPIC_PAGE_KIND,
  EVENTS_TOPIC_TEMPLATE_PRESET,
  buildEventsListingSections,
  eventsListingPreset,
} from "../../shared/events-page-templates.js";

import { registerSitePathHandler } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

import type {
  EventFeedTab,
  EventListItem,
  EventSourceKind,
  EventTopic,
} from "../../shared/index.js";
import type {
  SitePathHandlerInput,
  SitePathRenderResult,
} from "@rewindom/builtin/marketing/shared/site-path-handlers.js";
import type { AppLocale } from "@rewindom/module-sdk";

function mountOf(input: { homeLayoutKey?: string }): {
  homeLayoutKey?: string;
} {
  return { homeLayoutKey: input.homeLayoutKey };
}

export async function renderEventsPath(
  input: SitePathHandlerInput,
): Promise<SitePathRenderResult> {
  const locale = normalizeLocale(input.locale);
  const route = parseEventsPublicPath(input.path);
  if (!route) {
    if (
      !isEventsRootQueryTakeover(
        input.path,
        input.query,
        mountOf(input),
      )
    ) {
      return null;
    }
    const query = parseEventsIndexQuery(input.query);
    if (!isEventsIndexListing(query)) return null;
    return renderListing(input, locale, query.source, undefined, query.kind);
  }

  if (route.type === "feed" || route.type === "entity_feed") {
    const feedInput = {
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      origin: input.origin,
      locale,
      selfPath: input.servedPath ?? input.path,
    };
    if (route.type === "entity_feed") {
      return renderEntityFeed(feedInput, route.slug);
    }
    if (route.topic && !(await isTopicOn(input.tenantId, route.topic))) {
      return null;
    }
    return renderEventsFeed(feedInput, route.topic);
  }
  if (route.type === "og_image") {
    return renderEventOgImage({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      origin: input.origin,
      slug: route.slug,
    });
  }

  if (route.type === "entity_index") {
    return renderEntityIndex(input, locale);
  }
  if (route.type === "entity") {
    return renderEntity(input, locale, route.slug);
  }
  if (route.type === "event") {
    return renderDetail(input, locale, route.slug);
  }
  if (!(await isTopicOn(input.tenantId, route.topic))) {
    return null;
  }
  return renderTopic(input, locale, route.topic);
}

async function isTopicOn(
  tenantId: string,
  topic: EventTopic,
): Promise<boolean> {
  return isTopicEnabled(await getEnabledTopics(tenantId), topic);
}

/**
 * 实体枢纽 `/entities`。清单为空也照样渲染——与实体详情不同：那里没有实体
 * 是 404，这里是一张常驻页面，段自己画空态。
 */
async function renderEntityIndex(
  input: SitePathHandlerInput,
  locale: AppLocale,
): Promise<string> {
  const [rows, t] = await Promise.all([
    getPublicEntityIndex(input.tenantId),
    Promise.resolve(translator(locale)),
  ]);
  const href = entityIndexPath();

  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_ENTITY_INDEX_PAGE_KIND,
    path: href,
    servedPath: input.servedPath ?? href,
    preset: EVENTS_ENTITY_INDEX_TEMPLATE_PRESET,
    description: t("entityIndex.metaDescription", { count: rows.length }),
    events: emptyEventsContext({
      entity_index: toPublicEntityIndex(rows, t),
    }),
  });
}

async function renderEntity(
  input: SitePathHandlerInput,
  locale: AppLocale,
  slug: string,
): Promise<string | null> {
  const entity = await getPublicEntityBySlug(input.tenantId, slug);
  if (!entity) {
    return null;
  }

  const t = translator(locale);
  const href = entityPath(entity.slug);
  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_ENTITY_PAGE_KIND,
    path: href,
    servedPath: input.servedPath ?? href,
    preset: EVENTS_ENTITY_TEMPLATE_PRESET,
    omitHreflang: true,
    canonicalPath: href,
    events: emptyEventsContext({
      entity: toPublicEntity(entity, t),
    }),
  });
}

async function renderTopic(
  input: SitePathHandlerInput,
  locale: AppLocale,
  topic: EventTopic,
): Promise<string> {
  const query = parseEventsIndexQuery(input.query);
  const listingQuery = { ...query, topic };
  if (isEventsIndexListing(listingQuery)) {
    return renderListing(
      input,
      locale,
      listingQuery.source,
      topic,
      listingQuery.kind,
    );
  }

  const [feed, entityRows, heroStats] = await Promise.all([
    getPublicEventFeed(input.tenantId, topic),
    getPublicEntityIndex(input.tenantId, topic),
    getPublicHeroStats(input.tenantId, topic),
  ]);
  const t = translator(locale);
  const topicLabel = t(`topic.${topic}`);
  const pagePath = topicPath(topic);

  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_TOPIC_PAGE_KIND,
    path: pagePath,
    servedPath: input.servedPath ?? pagePath,
    preset: EVENTS_TOPIC_TEMPLATE_PRESET,
    events: emptyEventsContext({
      topic,
      topic_label: topicLabel,
      feed: {
        rising: feed.rising.map((item) => toCard(item, t)),
        now: feed.now.map((item) => toCard(item, t)),
      },
      entity_strip: toPublicEntityStrip(entityRows),
      hero: toPublicHero(heroStats, t),
    }),
  });
}

async function renderListing(
  input: SitePathHandlerInput,
  locale: AppLocale,
  source: EventFeedTab,
  topic: EventTopic | undefined,
  kind?: EventSourceKind,
): Promise<string> {
  const items = await getPublicEventList(input.tenantId, source, topic, kind);
  const t = translator(locale);
  const cards = items.map((item) => toCard(item, t));
  const sourceLabel = t(`sections.${source}`);
  const title = topic ? `${sourceLabel} · ${t(`topic.${topic}`)}` : sourceLabel;
  const pagePath = topic ? topicPath(topic) : eventsHubPath();

  const listing = eventsListingPreset(source, topic);
  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: listing.kind,
    path: pagePath,
    servedPath: input.servedPath ?? pagePath,
    preset: listing,
    title,
    description: topic
      ? t("listing.metaDescription", {
          source: sourceLabel,
          topic: t(`topic.${topic}`),
        })
      : t("listing.metaDescriptionAll", { source: sourceLabel }),
    noindex: true,
    omitHreflang: true,
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
  if (!detail) {
    return null;
  }

  const t = translator(locale);
  const href = eventPath(slug);
  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_DETAIL_PAGE_KIND,
    path: href,
    servedPath: input.servedPath ?? href,
    preset: EVENTS_DETAIL_TEMPLATE_PRESET,
    omitHreflang: true,
    canonicalPath: href,
    ogImage: isEventOgImageAvailable()
      ? `${input.origin}${eventOgImagePath(slug)}`
      : undefined,
    events: emptyEventsContext({
      event: toPublicDetail(detail, t),
      topic: detail.topic,
      topic_label: t(`topic.${detail.topic}`),
    }),
  });
}

function translator(locale: AppLocale) {
  return (key: string, params?: Record<string, string | number>): string =>
    eventsMessage(locale, key, params);
}

function toCard(
  item: EventListItem,
  t: ReturnType<typeof translator>,
) {
  return toPublicCard(item, t);
}

export function registerEventsPathHandler(): void {
  registerSitePathHandler({
    match: (path, ctx) =>
      isEventsPath(path) ||
      isEventsRootQueryTakeover(path, ctx?.query ?? {}, mountOf(ctx ?? {})),
    entitlement: EVENTS_ENTITLEMENT.key,
    render: renderEventsPath,
  });
}
