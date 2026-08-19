/**
 * 公开事件页的路径处理：`/events`、`/events/:topic` 与 `/events/:slug`（含 `/en/...` 前缀）。
 *
 * 选了事件雷达版式（或存量把 `/events` 设为首页）后：旧前缀 301 到根上；
 * `/` 由首页 CMS 渲染；`/?source=` 由本 handler 接管列表；
 * `/:topic` / `/:slug` / `/entity/:slug` 在 CMS 未命中后由 fallback 接。
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
  getPublicEntityBySlug,
  getPublicEventBySlug,
  getPublicEventFeed,
  getPublicEventList,
} from "./public-events.service.js";
import { getEnabledTopics } from "../event/topic-settings.service.js";

import {
  EVENTS_DETAIL_PAGE_KIND,
  EVENTS_ENTITLEMENT,
  EVENTS_ENTITY_PAGE_KIND,
  emptyEventsContext,
  entityFeedPath,
  entityPath,
  eventPath,
  eventsCanonicalLocation,
  eventsIndexPath,
  eventsMountedAtRoot,
  isEventsIndexListing,
  isEventsPath,
  isEventsRootFallbackPath,
  isEventsRootQueryTakeover,
  isTopicEnabled,
  parseEventsIndexQuery,
  parseEventsRequestPath,
  topicPath,
  toPublicCard,
  toPublicDetail,
} from "../../shared/index.js";
import {
  EVENTS_DETAIL_TEMPLATE_PRESET,
  EVENTS_ENTITY_TEMPLATE_PRESET,
  EVENTS_INDEX_PAGE_KIND,
  EVENTS_INDEX_TEMPLATE_PRESET,
  buildEventsListingSections,
} from "../../shared/events-page-templates.js";

import {
  registerSitePathFallback,
  registerSitePathHandler,
} from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

import type {
  EventFeedTab,
  EventListItem,
  EventSourceKind,
  EventTopic,
} from "../../shared/index.js";
import type { SitePathHandlerInput } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";
import type { AppLocale } from "@rewindom/module-sdk";

function mountOf(input: {
  homePath?: string;
  homeLayoutKey?: string;
}): { homePath?: string; homeLayoutKey?: string } {
  return { homePath: input.homePath, homeLayoutKey: input.homeLayoutKey };
}

function indexPathOf(input: SitePathHandlerInput): string {
  return eventsIndexPath(mountOf(input));
}

async function renderEventsPath(
  input: SitePathHandlerInput,
): Promise<string | null> {
  const atRoot = eventsMountedAtRoot(mountOf(input));
  const route = parseEventsRequestPath(input.path, atRoot);
  if (!route) {
    return null;
  }

  const locale = normalizeLocale(input.locale);
  const indexPath = indexPathOf(input);

  if (route.type === "entity") {
    return renderEntity(input, locale, route.slug, indexPath);
  }
  if (route.type === "event") {
    return renderDetail(input, locale, route.slug, indexPath);
  }
  const pathTopic = route.type === "topic" ? route.topic : undefined;
  const query = parseEventsIndexQuery(input.query);
  const topic = pathTopic ?? query.topic;
  if (topic) {
    const enabled = await getEnabledTopics(input.tenantId);
    if (!isTopicEnabled(enabled, topic)) {
      return null;
    }
  }
  return renderIndex(input, locale, indexPath, pathTopic);
}

async function renderEntity(
  input: SitePathHandlerInput,
  locale: AppLocale,
  slug: string,
  indexPath: string,
): Promise<string | null> {
  const entity = await getPublicEntityBySlug(input.tenantId, slug);
  // 实体不存在 → 交回 404，而不是渲染一张空实体页
  if (!entity) {
    return null;
  }

  const t = translator(locale);
  const href = entityPath(entity.slug, indexPath);
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
    title: entity.name,
    description: t("entity.metaDescription", {
      name: entity.name,
      count: entity.event_count,
    }),
    events: emptyEventsContext({
      index_path: indexPath,
      entity: {
        slug: entity.slug,
        href,
        feed_href: entityFeedPath(entity.slug),
        name: entity.name,
        kind_label: t(`entityKind.${entity.kind}`),
        event_count: entity.event_count,
        // kind 参数是嵌套 code（`kind.outage`），先翻出来再代进去
        profile: entity.profile.map((fact) =>
          t(fact.code, {
            ...fact.params,
            ...(typeof fact.params?.kind === "string"
              ? { kind: t(fact.params.kind) }
              : {}),
          }),
        ),
        events: entity.events.map((item) => toCard(item, t, indexPath)),
      },
    }),
  });
}

async function renderIndex(
  input: SitePathHandlerInput,
  locale: AppLocale,
  indexPath: string,
  pathTopic?: EventTopic,
): Promise<string> {
  const query = parseEventsIndexQuery(input.query);
  const topic = pathTopic ?? query.topic;
  const pagePath = topic ? topicPath(topic, indexPath) : indexPath;
  const listingQuery = { ...query, topic };
  if (isEventsIndexListing(listingQuery)) {
    return renderListing(
      input,
      locale,
      listingQuery.source,
      listingQuery.topic,
      indexPath,
      listingQuery.kind,
    );
  }

  const feed = await getPublicEventFeed(input.tenantId, topic);
  const t = translator(locale);

  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_INDEX_PAGE_KIND,
    path: pagePath,
    servedPath: input.servedPath ?? pagePath,
    preset: EVENTS_INDEX_TEMPLATE_PRESET,
    title: topic ? t(`topic.${topic}`) : undefined,
    events: emptyEventsContext({
      index_path: indexPath,
      topic,
      feed: {
        rising: feed.rising.map((item) => toCard(item, t, indexPath)),
        now: feed.now.map((item) => toCard(item, t, indexPath)),
      },
    }),
  });
}

async function renderListing(
  input: SitePathHandlerInput,
  locale: AppLocale,
  source: EventFeedTab,
  topic: EventTopic | undefined,
  indexPath: string,
  kind?: EventSourceKind,
): Promise<string> {
  const items = await getPublicEventList(input.tenantId, source, topic, kind);
  const t = translator(locale);
  const cards = items.map((item) => toCard(item, t, indexPath));
  const sourceLabel = t(`sections.${source}`);
  const title = topic ? `${sourceLabel} · ${t(`topic.${topic}`)}` : sourceLabel;
  const pagePath = topic ? topicPath(topic, indexPath) : indexPath;

  return renderEventsTemplatePage({
    tenantId: input.tenantId,
    tenantSlug: input.tenantSlug,
    siteName: input.tenantSlug,
    origin: input.origin,
    locale,
    kind: EVENTS_INDEX_PAGE_KIND,
    path: pagePath,
    servedPath: input.servedPath ?? pagePath,
    preset: EVENTS_INDEX_TEMPLATE_PRESET,
    title,
    sections: buildEventsListingSections(
      source,
      topic,
      createEventsPresetTranslator(locale),
    ),
    events: emptyEventsContext({
      index_path: indexPath,
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
  indexPath: string,
): Promise<string | null> {
  const detail = await getPublicEventBySlug(input.tenantId, slug);
  // 事件不存在、或主题已关 → 交回 404，而不是渲染一张空详情页
  if (!detail) {
    return null;
  }

  const t = translator(locale);
  const href = eventPath(slug, indexPath);
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
    title: detail.title,
    description: detail.headline || undefined,
    events: emptyEventsContext({
      index_path: indexPath,
      event: toPublicDetail(detail, t, indexPath),
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
  indexPath: string,
) {
  return toPublicCard(item, t, indexPath);
}

export function registerEventsPathHandler(): void {
  registerSitePathHandler({
    match: (path, ctx) =>
      isEventsPath(path) ||
      isEventsRootQueryTakeover(path, ctx?.query ?? {}, mountOf(ctx ?? {})),
    entitlement: EVENTS_ENTITLEMENT.key,
    canonicalRedirect: (input) =>
      eventsCanonicalLocation(input.path, mountOf(input), input.query),
    render: renderEventsPath,
  });
  registerSitePathFallback({
    entitlement: EVENTS_ENTITLEMENT.key,
    match: (path, ctx) =>
      eventsMountedAtRoot(mountOf(ctx)) && isEventsRootFallbackPath(path),
    render: renderEventsPath,
  });
}
