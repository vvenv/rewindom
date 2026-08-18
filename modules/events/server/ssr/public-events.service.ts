import {
  normalizeLocale,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { entityPath, eventPath, eventsIndexPath } from "../../shared/index.js";

import { withSiteLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { toEventDetail, toEventListItem } from "../event/event.mapper.js";
import { listEventEntities } from "../event/entity.service.js";
import { listRelatedEvents } from "../event/related.service.js";
import {
  listEventRevisions,
  publicRevisionSince,
} from "../event/event-revision.service.js";
import { getEnabledTopics } from "../event/topic-settings.service.js";

import type {
  EventDetail,
  EventFeedTab,
  EventListItem,
  EventTopic,
} from "../../shared/index.js";
import { enabledTopicWhere, isTopicEnabled } from "../../shared/index.js";
import type { AppLocale } from "@rewindom/module-sdk";
import type { SitemapEntry } from "@rewindom/builtin/marketing/server/site.service.js";

/**
 * 公开面的读取。
 *
 * 与工作台那套（`event/event.service.ts`）刻意分开，理由只有一个：**公开面没有 viewer**。
 * 那边每个查询都要带上 tenant + user 去查关注状态，这边没有登录用户。
 * 语料本身按站点隔离——公开面用的是当前站点的 tenant_id，不是「全平台一份」。
 */

const HOUR_MS = 60 * 60 * 1000;
const LIVE_WINDOW_HOURS = 24;
const RISING_WINDOW_HOURS = LIVE_WINDOW_HOURS;
const NOW_WINDOW_HOURS = LIVE_WINDOW_HOURS;

/** 公开面一次最多取多少张卡。段自己的 `limit` 再往下截，这里只是查询上限。 */
const FEED_FETCH_LIMIT = 12;
/** 「查看全部」列表不再受区块 12 条上限约束，但仍封顶，避免一次铺几百张。 */
const LISTING_FETCH_LIMIT = 48;

const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  topic: true,
  status: true,
  heat_score: true,
  velocity_pct: true,
  has_velocity_baseline: true,
  recent_signal_count: true,
  recent_source_count: true,
  signal_count: true,
  source_count: true,
  source_names: true,
  first_seen_at: true,
  last_activity_at: true,
} as const;

export interface PublicFeedData {
  rising: EventListItem[];
  now: EventListItem[];
}

export async function getPublicEventFeed(
  tenantId: string,
  topic?: EventTopic,
): Promise<PublicFeedData> {
  const now = Date.now();
  const enabled = await getEnabledTopics(tenantId);
  const topicWhere = enabledTopicWhere(enabled, topic);
  const tenantWhere = withTenantScope(tenantId, topicWhere);

  const [rising, nowEvents] = await Promise.all([
    prisma.newsEvent.findMany({
      where: {
        ...tenantWhere,
        status: { in: ["developing", "active"] },
        last_activity_at: { gte: new Date(now - RISING_WINDOW_HOURS * HOUR_MS) },
        recent_signal_count: { gt: 0 },
      },
      orderBy: [
        { recent_source_count: "desc" },
        { recent_signal_count: "desc" },
        { heat_score: "desc" },
      ],
      take: FEED_FETCH_LIMIT,
      select: LIST_SELECT,
    }),
    prisma.newsEvent.findMany({
      where: {
        ...tenantWhere,
        status: { in: ["developing", "active"] },
        last_activity_at: { gte: new Date(now - NOW_WINDOW_HOURS * HOUR_MS) },
      },
      orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
      take: FEED_FETCH_LIMIT,
      select: LIST_SELECT,
    }),
  ]);

  /*
   * 与工作台不同：这里**不做**两段互斥。官网上两段可能被租户拆到不同页面、
   * 也可能只摆其中一段——按「谁先出现就从后面扣掉」来算，单独摆一段时就会莫名少内容。
   */
  const map = (records: typeof rising): EventListItem[] =>
    records.map((record) => toEventListItem(record, null));

  return {
    rising: map(rising),
    now: map(nowEvents),
  };
}

/** 查询列表页：只取当前 source 对应的那一批，条数比区块预览多。 */
export async function getPublicEventList(
  tenantId: string,
  source: EventFeedTab,
  topic?: EventTopic,
): Promise<EventListItem[]> {
  const now = Date.now();
  const enabled = await getEnabledTopics(tenantId);
  const topicWhere = enabledTopicWhere(enabled, topic);
  const tenantWhere = withTenantScope(tenantId, topicWhere);
  const common = { take: LISTING_FETCH_LIMIT, select: LIST_SELECT } as const;

  const records =
    source === "now"
      ? await prisma.newsEvent.findMany({
          ...common,
          where: {
            ...tenantWhere,
            status: { in: ["developing", "active"] },
            last_activity_at: { gte: new Date(now - NOW_WINDOW_HOURS * HOUR_MS) },
          },
          orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
        })
      : await prisma.newsEvent.findMany({
          ...common,
          where: {
            ...tenantWhere,
            status: { in: ["developing", "active"] },
            last_activity_at: {
              gte: new Date(now - RISING_WINDOW_HOURS * HOUR_MS),
            },
            recent_signal_count: { gt: 0 },
          },
          orderBy: [
            { recent_source_count: "desc" },
            { recent_signal_count: "desc" },
            { heat_score: "desc" },
          ],
        });

  return records.map((record) => toEventListItem(record, null));
}

/** RSS 一次给多少条。阅读器普遍只留最近若干条，给太多只是浪费带宽。 */
const RSS_LIMIT = 30;

/**
 * RSS 用的事件列表：最近有动静的排前面。
 *
 * 与首页两段刻意不同：订阅者要的是**时间线**（最近发生了什么），
 * 不是「正在升温」那种排序——feed 阅读器会自己按 pubDate 排，
 * 给它一个按热度排的列表只会让阅读器里的顺序看起来是乱的。
 */
export async function getPublicEventsForRss(
  tenantId: string,
  topic?: EventTopic,
): Promise<EventListItem[]> {
  const enabled = await getEnabledTopics(tenantId);
  const rows = await prisma.newsEvent.findMany({
    where: withTenantScope(tenantId, enabledTopicWhere(enabled, topic)),
    orderBy: { last_activity_at: "desc" },
    take: RSS_LIMIT,
    select: LIST_SELECT,
  });
  return rows.map((record) => toEventListItem(record, null));
}

/** 某个实体的事件，供 `/events/entity/<slug>/feed.xml` 用。 */
export async function getPublicEntityEventsForRss(
  tenantId: string,
  slug: string,
): Promise<{ name: string; events: EventListItem[] } | null> {
  const entity = await prisma.eventEntity.findFirst({
    where: withTenantScope(tenantId, { slug }),
    select: { name: true },
  });
  if (!entity) {
    return null;
  }
  const enabled = await getEnabledTopics(tenantId);
  const links = await prisma.eventEntityLink.findMany({
    where: withTenantScope(tenantId, {
      entity: { slug },
      event: enabledTopicWhere(enabled),
    }),
    orderBy: { event: { last_activity_at: "desc" } },
    take: RSS_LIMIT,
    select: { event: { select: LIST_SELECT } },
  });
  return {
    name: entity.name,
    events: links.map((link) => toEventListItem(link.event, null)),
  };
}

/** slug 找不到、或事件落在已关掉的主题上时返回 null（→ 404）。 */
export async function getPublicEventBySlug(
  tenantId: string,
  slug: string,
): Promise<EventDetail | null> {
  const enabled = await getEnabledTopics(tenantId);
  const record = await prisma.newsEvent.findFirst({
    where: withTenantScope(tenantId, {
      slug,
      ...enabledTopicWhere(enabled),
    }),
    select: {
      ...LIST_SELECT,
      analyzer: true,
      analyzed_at: true,
      manual_content: true,
      manual_topic: true,
      related_event_ids: true,
    },
  });
  if (!record) {
    return null;
  }

  const [timeline, signals] = await Promise.all([
    prisma.eventTimelineEntry.findMany({
      where: withTenantScope(tenantId, { event_id: record.id }),
      orderBy: { occurred_at: "asc" },
      select: {
        id: true,
        occurred_at: true,
        label_code: true,
        label_text: true,
        source_kind: true,
        source_name: true,
        url: true,
      },
    }),
    prisma.eventSignal.findMany({
      // 与工作台同一条口径：手动移除过的信号不进公开面
      where: withTenantScope(tenantId, {
        event_id: record.id,
        removed_at: null,
      }),
      orderBy: { published_at: "desc" },
      select: {
        id: true,
        title: true,
        url: true,
        source_name: true,
        source_kind: true,
        published_at: true,
        score: true,
        comment_count: true,
      },
    }),
  ]);

  // 公开面没有 viewer，也就没有「上次查看」这个基线；展示最近一段时间的变化
  const revisions = await listEventRevisions({
    tenant_id: tenantId,
    event_id: record.id,
    since: publicRevisionSince(new Date()),
  });

  const [entities, related] = await Promise.all([
    listEventEntities({ tenant_id: tenantId, event_id: record.id }),
    listRelatedEvents({
      tenant_id: tenantId,
      related_ids: record.related_event_ids,
    }),
  ]);

  return toEventDetail({
    record,
    timeline,
    signals,
    revisions,
    entities,
    related: related.filter((row) =>
      isTopicEnabled(enabled, row.topic as EventTopic),
    ),
    follow: null,
  });
}

/** 实体页一次最多列多少事件。再多就该分页了，而实体页不是列表页。 */
const ENTITY_EVENT_LIMIT = 30;

export interface PublicEntityData {
  slug: string;
  name: string;
  kind: string;
  event_count: number;
  events: EventListItem[];
}

/**
 * 实体页取数：这个实体是谁 + 它涉及的事件（按最近活动降序）。
 *
 * slug 找不到时返回 null（→ 404），而不是渲染一张空实体页。
 */
export async function getPublicEntityBySlug(
  tenantId: string,
  slug: string,
): Promise<PublicEntityData | null> {
  const entity = await prisma.eventEntity.findFirst({
    where: withTenantScope(tenantId, { slug }),
    select: { slug: true, name: true, kind: true },
  });
  if (!entity) {
    return null;
  }

  const enabled = await getEnabledTopics(tenantId);
  const eventFilter = enabledTopicWhere(enabled);
  const [links, eventCount] = await Promise.all([
    prisma.eventEntityLink.findMany({
      where: withTenantScope(tenantId, {
        entity: { slug },
        event: eventFilter,
      }),
      orderBy: { event: { last_activity_at: "desc" } },
      take: ENTITY_EVENT_LIMIT,
      select: { event: { select: LIST_SELECT } },
    }),
    prisma.eventEntityLink.count({
      where: withTenantScope(tenantId, {
        entity: { slug },
        event: eventFilter,
      }),
    }),
  ]);

  return {
    ...entity,
    event_count: eventCount,
    events: links.map((link) => toEventListItem(link.event, null)),
  };
}

/**
 * sitemap：只收最近 30 天还有动静的事件，且封顶 500 条。
 *
 * 事件是持续产生的，全量铺给爬虫既没意义也会把 sitemap 撑爆；陈年事件页在主题仍开着时
 * 可访问，只是不主动送去索引。关掉主题的事件页 404，也不进 sitemap。
 *
 * 只输出**站点默认语言**那一条：同一个事件在各语言下是同一条记录（文案是 locale map），
 * 但「这个站开了哪几种语言」要另查站点配置，为 sitemap 多查一次不划算。
 * 少报 alternates 是安全方向——不会产生指错的 hreflang。
 */
export async function getPublicEventSitemapEntries(
  tenantId: string,
): Promise<SitemapEntry[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * HOUR_MS);
  const enabled = await getEnabledTopics(tenantId);
  const [site, rows] = await Promise.all([
    resolvePublicSite(tenantId),
    prisma.newsEvent.findMany({
      where: withTenantScope(tenantId, {
        last_activity_at: { gte: cutoff },
        ...enabledTopicWhere(enabled),
      }),
      orderBy: { last_activity_at: "desc" },
      take: 500,
      select: { slug: true, last_activity_at: true },
    }),
  ]);

  return rows.map((row) => {
    const path = withSiteLocale(
      eventPath(row.slug, site.indexPath),
      site.locale,
      site.locale,
    );
    return {
      path,
      updated_at: row.last_activity_at.toISOString(),
      alternates: [{ locale: site.locale, path }],
    };
  });
}

/**
 * 实体页的 sitemap。
 *
 * 与事件同一条口径：只收**最近 30 天还有事件**的实体，封顶 500 条。
 * 陈年实体页仍然可访问，只是不主动送去索引。
 *
 * 实体页比事件页更值得被索引——事件 24h 后就凉，实体不会——但也正因为它长期存在，
 * 更要挡住「三年前提过一次就永远进 sitemap」的长尾。
 */
export async function getPublicEntitySitemapEntries(
  tenantId: string,
): Promise<SitemapEntry[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * HOUR_MS);
  const enabled = await getEnabledTopics(tenantId);
  const [site, rows] = await Promise.all([
    resolvePublicSite(tenantId),
    prisma.eventEntity.findMany({
      where: withTenantScope(tenantId, {
        links: {
          some: {
            event: {
              last_activity_at: { gte: cutoff },
              ...enabledTopicWhere(enabled),
            },
          },
        },
      }),
      orderBy: { updated_at: "desc" },
      take: 500,
      select: { slug: true, updated_at: true },
    }),
  ]);

  return rows.map((row) => {
    const path = withSiteLocale(
      entityPath(row.slug, site.indexPath),
      site.locale,
      site.locale,
    );
    return {
      path,
      updated_at: row.updated_at.toISOString(),
      alternates: [{ locale: site.locale, path }],
    };
  });
}

async function resolvePublicSite(
  tenantId: string,
): Promise<{ locale: AppLocale; indexPath: string }> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenantId),
    select: {
      default_locale: true,
      home_path: true,
      home_layout_key: true,
    },
  });
  return {
    locale: normalizeLocale(site?.default_locale),
    indexPath: eventsIndexPath({
      homePath: site?.home_path ?? undefined,
      homeLayoutKey: site?.home_layout_key ?? undefined,
    }),
  };
}
