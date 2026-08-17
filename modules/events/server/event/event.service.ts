import {
  NotFoundError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { toEventDetail, toEventListItem } from "./event.mapper.js";

import type { FollowMarker } from "./event.mapper.js";
import type { AppLocale } from "@rewindom/module-sdk";
import type {
  EventDetail,
  EventFeedResult,
  EventListItem,
  EventListResult,
  EventStatus,
  EventTopic,
  EventTopicCount,
} from "../../shared/index.js";

/** 与前端可排序列一一对应（verify-module 会比对这两侧）。 */
const EVENT_SORTABLE_FIELDS = new Set([
  "last_activity_at",
  "first_seen_at",
  "heat_score",
  "velocity_pct",
  "signal_count",
]);

const HOUR_MS = 60 * 60 * 1000;
/** 「今天」按滚动 24 小时算，不按自然日——用户在任何时区打开看到的都是同一批事件。 */
const TODAY_WINDOW_HOURS = 24;
const RISING_WINDOW_HOURS = 24;
const NOW_WINDOW_HOURS = 12;
const RISING_LIMIT = 5;
const NOW_LIMIT = 6;
const TODAY_LIMIT = 10;

const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  origin_locale: true,
  title_i18n: true,
  summary_i18n: true,
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

export interface EventViewerScope {
  tenant_id: string;
  user_id: string;
  /** 读取语言。事件文案是数据多语言，落成哪种语言在**读取时**决定 */
  locale: AppLocale;
}

export interface ListEventsParams extends EventViewerScope {
  page: number;
  page_size: number;
  q?: string;
  topic?: EventTopic;
  status?: EventStatus;
  /** 只看我关注的 */
  following_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export async function listEvents(
  params: ListEventsParams,
): Promise<EventListResult> {
  const where = await buildListWhere(params);
  const skip = (params.page - 1) * params.page_size;

  const [records, total] = await Promise.all([
    prisma.newsEvent.findMany({
      where,
      orderBy: buildOrderBy(params.sort_by, params.sort_dir),
      skip,
      take: params.page_size,
      select: LIST_SELECT,
    }),
    prisma.newsEvent.count({ where }),
  ]);

  const follows = await loadFollowMarkers(params, records.map((r) => r.id));

  return {
    items: records.map((record) =>
      toEventListItem(record, params.locale, follows.get(record.id) ?? null),
    ),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

/**
 * 首页三个区块一次取回。
 *
 * 分三次请求会让首屏出现三段各自 loading 的骨架；而这三段本来就是同一个问题的
 * 三种切法（MVP §14：打开 10 秒就知道今天有什么事在发生）。
 * Now 排除 Rising、Today 再排除前两者，同一个事件不会在一屏里出现三次。
 */
export async function getEventFeed(
  params: EventViewerScope & { topic?: EventTopic },
): Promise<EventFeedResult> {
  const now = Date.now();
  const topicWhere = params.topic ? { topic: params.topic } : {};

  const rising = await prisma.newsEvent.findMany({
    where: {
      ...topicWhere,
      status: { in: ["developing", "active"] },
      last_activity_at: { gte: new Date(now - RISING_WINDOW_HOURS * HOUR_MS) },
      velocity_pct: { gt: 0 },
    },
    orderBy: [{ velocity_pct: "desc" }, { heat_score: "desc" }],
    take: RISING_LIMIT,
    select: LIST_SELECT,
  });

  const risingIds = rising.map((event) => event.id);
  const nowEvents = await prisma.newsEvent.findMany({
    where: {
      ...topicWhere,
      id: { notIn: risingIds },
      status: { in: ["developing", "active"] },
      last_activity_at: { gte: new Date(now - NOW_WINDOW_HOURS * HOUR_MS) },
    },
    orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
    take: NOW_LIMIT,
    select: LIST_SELECT,
  });

  const todayCutoff = new Date(now - TODAY_WINDOW_HOURS * HOUR_MS);
  const seenIds = [...risingIds, ...nowEvents.map((event) => event.id)];
  const [today, todayTotal] = await Promise.all([
    prisma.newsEvent.findMany({
      where: {
        ...topicWhere,
        id: { notIn: seenIds },
        last_activity_at: { gte: todayCutoff },
      },
      orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
      take: TODAY_LIMIT,
      select: LIST_SELECT,
    }),
    prisma.newsEvent.count({
      where: { ...topicWhere, last_activity_at: { gte: todayCutoff } },
    }),
  ]);

  const follows = await loadFollowMarkers(params, [
    ...seenIds,
    ...today.map((event) => event.id),
  ]);
  const map = (records: typeof rising): EventListItem[] =>
    records.map((record) =>
      toEventListItem(record, params.locale, follows.get(record.id) ?? null),
    );

  return {
    rising: map(rising),
    now: map(nowEvents),
    today: map(today),
    today_total: todayTotal,
  };
}

/** `event_id` 同时接受 uuid 与 slug——详情页 URL 用哪个都能开。 */
export async function getEventDetail(
  params: EventViewerScope & { event_id: string },
): Promise<EventDetail> {
  const record = await prisma.newsEvent.findFirst({
    where: { OR: [{ id: params.event_id }, { slug: params.event_id }] },
    select: { ...LIST_SELECT, analyzer: true, analyzed_at: true },
  });
  if (!record) {
    throw new NotFoundError("events.not_found");
  }

  const [timeline, signals, follows] = await Promise.all([
    prisma.eventTimelineEntry.findMany({
      where: { event_id: record.id },
      orderBy: { occurred_at: "asc" },
      select: {
        id: true,
        occurred_at: true,
        label_code: true,
        label_text: true,
        label_text_i18n: true,
        source_kind: true,
        source_name: true,
        url: true,
      },
    }),
    prisma.eventSignal.findMany({
      where: { event_id: record.id },
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
    loadFollowMarkers(params, [record.id]),
  ]);

  return toEventDetail({
    record,
    locale: params.locale,
    timeline,
    signals,
    follow: follows.get(record.id) ?? null,
  });
}

/** 主题筛选条上的计数，只统计还「活着」的事件，避免陈年事件把数字撑大。 */
export async function listTopicCounts(): Promise<EventTopicCount[]> {
  const cutoff = new Date(Date.now() - TODAY_WINDOW_HOURS * 7 * HOUR_MS);
  const rows = await prisma.newsEvent.groupBy({
    by: ["topic"],
    where: { last_activity_at: { gte: cutoff } },
    _count: { _all: true },
  });

  return rows
    .map((row) => ({ topic: row.topic as EventTopic, count: row._count._all }))
    .sort((a, b) => b.count - a.count);
}

async function buildListWhere(params: ListEventsParams) {
  const q = params.q?.trim();
  const followingIds = params.following_only
    ? await loadFollowedEventIds(params)
    : null;

  return {
    ...(params.topic ? { topic: params.topic } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(followingIds ? { id: { in: followingIds } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { summary: { contains: q, mode: "insensitive" as const } },
            /*
             * 也要搜译文：中文访客搜「收购」时，原文标题里只有 "acquire"。
             * 只搜原文等于让非原文语种的用户搜不到任何东西。
             */
            { title_i18n: { path: [params.locale], string_contains: q } },
            { summary_i18n: { path: [params.locale], string_contains: q } },
          ],
        }
      : {}),
  };
}

function buildOrderBy(sortBy?: string, sortDir?: "asc" | "desc") {
  const field = resolveSortField(sortBy, EVENT_SORTABLE_FIELDS, "last_activity_at");
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as Record<string, "asc" | "desc">;
}

async function loadFollowedEventIds(scope: EventViewerScope): Promise<string[]> {
  const rows = await prisma.eventFollow.findMany({
    where: withTenantScope(scope.tenant_id, { user_id: scope.user_id }),
    select: { event_id: true },
  });
  return rows.map((row) => row.event_id);
}

/**
 * 一次性取回本页事件的关注状态。
 *
 * 关注是**租户态**数据（唯一一张带 tenant_id 的表），因此这里必须显式带上租户谓词——
 * 事件语料是全局的，但「谁关注了它」不是。
 */
async function loadFollowMarkers(
  scope: EventViewerScope,
  eventIds: readonly string[],
): Promise<Map<string, FollowMarker>> {
  if (eventIds.length === 0) {
    return new Map();
  }
  const rows = await prisma.eventFollow.findMany({
    where: withTenantScope(scope.tenant_id, {
      user_id: scope.user_id,
      event_id: { in: [...eventIds] },
    }),
    select: { event_id: true, last_seen_at: true },
  });
  return new Map(
    rows.map((row) => [row.event_id, { last_seen_at: row.last_seen_at }]),
  );
}
