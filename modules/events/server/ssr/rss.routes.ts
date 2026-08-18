/**
 * 公开 RSS 订阅。
 *
 * **为什么不走 path handler**：`SitePathHandler.render` 只回 HTML，没有 content-type
 * 控制，feed 会被当成 `text/html` 发出去。所以像 shop 店面那样挂模块自己的 Fastify 路由，
 * 在里面自行解析 host 租户。marketing 的 `sitemap.xml` 是内核路由——业务模块**不改内核**去蹭它。
 *
 * 三个入口对应三种订阅意图：
 *   /events/feed.xml                 这个站在报什么
 *   /events/feed.xml?topic=ai        只看某个主题
 *   /events/entity/<slug>/feed.xml   只看某个公司 / 产品（竞品没有这一条）
 */

import {
  requestOriginFromHeaders,
  resolveHostTenant,
  resolveRequestHostname,
} from "@rewindom/module-sdk/server";

import { getSiteChromeOrFallback } from "@rewindom/builtin/marketing/server/site.service.js";
import { resolvePageLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { eventsMessage } from "./events-preset-i18n.js";
import {
  getPublicEntityEventsForRss,
  getPublicEventsForRss,
} from "./public-events.service.js";

import { isEventsEnabled } from "../lib/entitlement.js";
import { getEnabledTopics } from "../event/topic-settings.service.js";

import {
  EVENTS_INDEX_PATH,
  entityPath,
  eventPath,
  isEventTopic,
  isTopicEnabled,
} from "../../shared/index.js";
import { renderRssXml } from "../../shared/sections/rss-xml.js";

import { isAppLocale, type AppLocale } from "@rewindom/module-sdk";

import type { EventListItem, EventTopic } from "../../shared/index.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

/** feed 变化不快，一小时的公共缓存与 sitemap 同口径。 */
const CACHE_CONTROL = "public, max-age=3600";

export async function eventsRssRoutes(app: FastifyInstance): Promise<void> {
  app.get("/events/feed.xml", async (request, reply) =>
    sendEventsFeed(request, reply),
  );
  app.get("/events/entity/:slug/feed.xml", async (request, reply) =>
    sendEntityFeed(request, reply),
  );

  /*
   * 带语言前缀的同一份 feed（`/en/events/feed.xml`）。
   * 事件内容不翻译（见 MODULE.md），前缀只影响 channel 文案与站内链接。
   */
  app.get("/:locale/events/feed.xml", async (request, reply) =>
    sendEventsFeed(request, reply),
  );
  app.get("/:locale/events/entity/:slug/feed.xml", async (request, reply) =>
    sendEntityFeed(request, reply),
  );
}

async function sendEventsFeed(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<unknown> {
  const scope = await resolveScope(request);
  if (!scope) {
    return notFound(reply);
  }

  const raw = (request.query as { topic?: string }).topic;
  const topic: EventTopic | undefined = isEventTopic(raw) ? raw : undefined;
  if (topic) {
    const enabled = await getEnabledTopics(scope.tenantId);
    if (!isTopicEnabled(enabled, topic)) {
      return notFound(reply);
    }
  }
  const events = await getPublicEventsForRss(scope.tenantId, topic);
  const t = (key: string) => eventsMessage(scope.locale, key);

  const title = topic
    ? `${scope.siteName} · ${t(`topic.${topic}`)}`
    : `${scope.siteName} · ${t("title")}`;

  return sendRss(
    reply,
    renderRssXml({
      title,
      link: absolute(scope, EVENTS_INDEX_PATH),
      description: t("pageDescription"),
      self_url: `${scope.origin}${request.url}`,
      language: scope.locale,
      items: events.map((event) => toRssItem(event, scope)),
    }),
  );
}

async function sendEntityFeed(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<unknown> {
  const scope = await resolveScope(request);
  if (!scope) {
    return notFound(reply);
  }

  const slug = (request.params as { slug: string }).slug;
  const entity = await getPublicEntityEventsForRss(scope.tenantId, slug);
  // 实体不存在 → 404，与实体页同口径，不发一份空 feed
  if (!entity) {
    return notFound(reply);
  }

  return sendRss(
    reply,
    renderRssXml({
      title: `${scope.siteName} · ${entity.name}`,
      link: absolute(scope, entityPath(slug)),
      description: eventsMessage(scope.locale, "entity.relatedEvents"),
      self_url: `${scope.origin}${request.url}`,
      language: scope.locale,
      items: entity.events.map((event) => toRssItem(event, scope)),
    }),
  );
}

interface RssScope {
  tenantId: string;
  siteName: string;
  origin: string;
  locale: AppLocale;
  localePrefix: string;
}

/**
 * 解析 host 租户 + 语言前缀。
 *
 * 未开通事件雷达的站点返回 null（→ 404），与 path handler 的 entitlement 闸门同口径：
 * 关掉模块之后这个地址就该不存在，而不是发一份空 feed。
 */
async function resolveScope(request: FastifyRequest): Promise<RssScope | null> {
  const host = await resolveHostTenant(resolveRequestHostname(request.headers));
  if (!host) {
    return null;
  }
  if (!(await isEventsEnabled(host.tenant_id))) {
    return null;
  }

  const rawLocale = (request.params as { locale?: string }).locale;
  const requested = isAppLocale(rawLocale) ? rawLocale : null;

  /*
   * 用**站点名**而不是租户 slug 做频道标题：这一行是订阅者在阅读器侧边栏里
   * 永久看到的东西，写成 `default` 会像坏了。多一次读换一个体面的标题，
   * 而 feed 本来就有一小时公共缓存。
   */
  const site = await getSiteChromeOrFallback(
    host.tenant_id,
    host.tenant_slug,
    host.tenant_slug,
    requested,
  );
  const locale = resolvePageLocale(requested, site.default_locale);

  return {
    tenantId: host.tenant_id,
    siteName: site.site_name || host.tenant_slug,
    origin: requestOriginFromHeaders(request) ?? `http://${request.hostname}`,
    locale,
    // 主语言无前缀；只有 URL 里带了「非主语言」段时才在站内链接上保留它
    localePrefix:
      requested && requested !== site.default_locale ? `/${requested}` : "",
  };
}

function absolute(scope: RssScope, path: string): string {
  return `${scope.origin}${scope.localePrefix}${path}`;
}

function toRssItem(event: EventListItem, scope: RssScope) {
  const sources =
    event.source_names.length > 0
      ? eventsMessage(scope.locale, "card.sources", {
          names: event.source_names.join(" · "),
        })
      : "";
  return {
    title: event.title,
    link: absolute(scope, eventPath(event.slug)),
    // headline 是摘要的第一句；再拼一行来源，让阅读器里也能看出跨源程度
    description: [event.headline, sources].filter(Boolean).join("\n"),
    published_at: event.last_activity_at,
  };
}

function sendRss(reply: FastifyReply, xml: string): unknown {
  return reply
    .header("content-type", "application/rss+xml; charset=utf-8")
    .header("cache-control", CACHE_CONTROL)
    .send(xml);
}

function notFound(reply: FastifyReply): unknown {
  return reply.status(404).send("Not Found");
}
