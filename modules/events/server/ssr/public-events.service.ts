import {
  normalizeLocale,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { eventPath } from "../../shared/index.js";

import { withSiteLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { toEventDetail, toEventListItem } from "../event/event.mapper.js";

import type {
  EventDetail,
  EventFeedTab,
  EventListItem,
  EventTopic,
} from "../../shared/index.js";
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
const TODAY_WINDOW_HOURS = 24;
const RISING_WINDOW_HOURS = 24;
const NOW_WINDOW_HOURS = 12;

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
  signal_count: true,
  source_count: true,
  source_names: true,
  first_seen_at: true,
  last_activity_at: true,
} as const;

export interface PublicFeedData {
  rising: EventListItem[];
  now: EventListItem[];
  today: EventListItem[];
  today_total: number;
}

export async function getPublicEventFeed(
  tenantId: string,
  topic?: EventTopic,
): Promise<PublicFeedData> {
  const now = Date.now();
  const topicWhere = topic ? { topic } : {};
  const tenantWhere = withTenantScope(tenantId, topicWhere);

  const [rising, nowEvents, today, todayTotal] = await Promise.all([
    prisma.newsEvent.findMany({
      where: {
        ...tenantWhere,
        status: { in: ["developing", "active"] },
        last_activity_at: { gte: new Date(now - RISING_WINDOW_HOURS * HOUR_MS) },
        velocity_pct: { gt: 0 },
      },
      orderBy: [{ velocity_pct: "desc" }, { heat_score: "desc" }],
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
    prisma.newsEvent.findMany({
      where: {
        ...tenantWhere,
        last_activity_at: { gte: new Date(now - TODAY_WINDOW_HOURS * HOUR_MS) },
      },
      orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
      take: FEED_FETCH_LIMIT,
      select: LIST_SELECT,
    }),
    prisma.newsEvent.count({
      where: {
        ...tenantWhere,
        last_activity_at: { gte: new Date(now - TODAY_WINDOW_HOURS * HOUR_MS) },
      },
    }),
  ]);

  /*
   * 与工作台不同：这里**不做**三段互斥。官网上三段可能被租户拆到不同页面、
   * 也可能只摆其中一段——按「谁先出现就从后面扣掉」来算，单独摆一段时就会莫名少内容。
   */
  const map = (records: typeof rising): EventListItem[] =>
    records.map((record) => toEventListItem(record, null));

  return {
    rising: map(rising),
    now: map(nowEvents),
    today: map(today),
    today_total: todayTotal,
  };
}

/** 查询列表页：只取当前 source 对应的那一批，条数比区块预览多。 */
export async function getPublicEventList(
  tenantId: string,
  source: EventFeedTab,
  topic?: EventTopic,
): Promise<EventListItem[]> {
  const now = Date.now();
  const topicWhere = topic ? { topic } : {};
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
      : source === "today"
        ? await prisma.newsEvent.findMany({
            ...common,
            where: {
              ...tenantWhere,
              last_activity_at: {
                gte: new Date(now - TODAY_WINDOW_HOURS * HOUR_MS),
              },
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
              velocity_pct: { gt: 0 },
            },
            orderBy: [{ velocity_pct: "desc" }, { heat_score: "desc" }],
          });

  return records.map((record) => toEventListItem(record, null));
}

/** slug 找不到时返回 null（→ 404），而不是抛错。 */
export async function getPublicEventBySlug(
  tenantId: string,
  slug: string,
): Promise<EventDetail | null> {
  const record = await prisma.newsEvent.findFirst({
    where: withTenantScope(tenantId, { slug }),
    select: {
      ...LIST_SELECT,
      analyzer: true,
      analyzed_at: true,
      manual_content: true,
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
      where: withTenantScope(tenantId, { event_id: record.id }),
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

  return toEventDetail({ record, timeline, signals, follow: null });
}

/**
 * sitemap：只收最近 30 天还有动静的事件，且封顶 500 条。
 *
 * 事件是持续产生的，全量铺给爬虫既没意义也会把 sitemap 撑爆；陈年事件页仍然可访问，
 * 只是不主动送去索引。
 *
 * 只输出**站点默认语言**那一条：同一个事件在各语言下是同一条记录（文案是 locale map），
 * 但「这个站开了哪几种语言」要另查站点配置，为 sitemap 多查一次不划算。
 * 少报 alternates 是安全方向——不会产生指错的 hreflang。
 */
export async function getPublicEventSitemapEntries(
  tenantId: string,
): Promise<SitemapEntry[]> {
  const cutoff = new Date(Date.now() - 30 * 24 * HOUR_MS);
  const [defaultLocale, rows] = await Promise.all([
    resolveSiteDefaultLocale(tenantId),
    prisma.newsEvent.findMany({
      where: withTenantScope(tenantId, { last_activity_at: { gte: cutoff } }),
      orderBy: { last_activity_at: "desc" },
      take: 500,
      select: { slug: true, last_activity_at: true },
    }),
  ]);

  return rows.map((row) => {
    const path = withSiteLocale(eventPath(row.slug), defaultLocale, defaultLocale);
    return {
      path,
      updated_at: row.last_activity_at.toISOString(),
      alternates: [{ locale: defaultLocale, path }],
    };
  });
}

async function resolveSiteDefaultLocale(tenantId: string): Promise<AppLocale> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenantId),
    select: { default_locale: true },
  });
  return normalizeLocale(site?.default_locale);
}
