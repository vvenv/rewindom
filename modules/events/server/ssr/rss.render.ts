/**
 * 公开 RSS 订阅的渲染。
 *
 *   /feed.xml                    这个站在报什么
 *   /topics/:slug/feed.xml       只看某个主题
 *   /entities/:slug/feed.xml     只看某个公司 / 产品
 */

import { eventsMessage } from "./events-preset-i18n.js";
import {
  getPublicEntityEventsForRss,
  getPublicEventsForRss,
} from "./public-events.service.js";

import { entityPath, eventPath, eventsHubPath } from "../../shared/index.js";
import { renderRssXml } from "../../shared/sections/rss-xml.js";

import { getSiteChromeOrFallback } from "@rewindom/builtin/marketing/server/site.service.js";
import { withSiteLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { EventListItem, EventTopic } from "../../shared/index.js";
import type { SitePathResponse } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";
import type { AppLocale } from "@rewindom/module-sdk";

/** feed 变化不快，一小时的公共缓存与 sitemap 同口径。 */
const CACHE_CONTROL = "public, max-age=3600";
const CONTENT_TYPE = "application/rss+xml; charset=utf-8";

interface FeedInput {
  tenantId: string;
  tenantSlug: string;
  origin: string;
  locale: AppLocale;
  /** feed 自身的对外地址（逻辑路径，不含 locale 前缀） */
  selfPath: string;
}

interface FeedScope extends FeedInput {
  siteName: string;
  defaultLocale: AppLocale;
}

/**
 * 频道标题用**站点名**而不是租户 slug：这一行是订阅者在阅读器侧边栏里永久
 * 看到的东西，写成 `default` 会像坏了。多一次读换一个体面的标题，
 * 而 feed 本来就有一小时公共缓存。
 */
async function resolveScope(input: FeedInput): Promise<FeedScope> {
  const site = await getSiteChromeOrFallback(
    input.tenantId,
    input.tenantSlug,
    input.tenantSlug,
    input.locale,
  );
  return {
    ...input,
    siteName: site.site_name || input.tenantSlug,
    defaultLocale: site.default_locale,
  };
}

export async function renderEventsFeed(
  input: FeedInput,
  topic?: EventTopic,
): Promise<SitePathResponse> {
  const scope = await resolveScope(input);
  const events = await getPublicEventsForRss(scope.tenantId, topic);
  const t = (key: string) => eventsMessage(scope.locale, key);

  const title = topic
    ? `${scope.siteName} · ${t(`topic.${topic}`)}`
    : `${scope.siteName} · ${t("title")}`;

  return sendRss(
    renderRssXml({
      title,
      link: absolute(scope, eventsHubPath()),
      description: t("pageDescription"),
      self_url: absolute(scope, scope.selfPath),
      language: scope.locale,
      items: events.map((event) => toRssItem(event, scope)),
    }),
  );
}

/** 实体不存在 → null（→ 404），与实体页同口径，不发一份空 feed。 */
export async function renderEntityFeed(
  input: FeedInput,
  slug: string,
): Promise<SitePathResponse | null> {
  const scope = await resolveScope(input);
  const entity = await getPublicEntityEventsForRss(scope.tenantId, slug);
  if (!entity) {
    return null;
  }

  return sendRss(
    renderRssXml({
      title: `${scope.siteName} · ${entity.name}`,
      link: absolute(scope, entityPath(slug)),
      /*
       * feed 的说明就是这一页的摘要（`{entity}` 是 CMS 插值，这里自己代掉）。
       * 曾经写的是段标题「相关事件」——脱离页面看，那三个字什么也没说。
       */
      description: eventsMessage(
        scope.locale,
        "site.entity.subtitle",
      ).replaceAll("{entity}", entity.name),
      self_url: absolute(scope, scope.selfPath),
      language: scope.locale,
      items: entity.events.map((event) => toRssItem(event, scope)),
    }),
  );
}

/** 逻辑路径 → 绝对地址。站点主语言不带前缀，与站内链接同一条规则。 */
function absolute(scope: FeedScope, path: string): string {
  return `${scope.origin}${withSiteLocale(path, scope.locale, scope.defaultLocale)}`;
}

function toRssItem(event: EventListItem, scope: FeedScope) {
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

function sendRss(xml: string): SitePathResponse {
  return {
    body: xml,
    content_type: CONTENT_TYPE,
    cache_control: CACHE_CONTROL,
  };
}
