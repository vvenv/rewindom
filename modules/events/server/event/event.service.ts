import {
  NotFoundError,
  ValidationError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { toEventDetail, toEventListItem } from "./event.mapper.js";
import { listEventEntities } from "./entity.service.js";
import { listRelatedEvents } from "./related.service.js";
import { getEventPlacementForDetail } from "./placement.service.js";
import { refreshEvents } from "./event-refresh.service.js";
import {
  listEventRevisions,
  publicRevisionSince,
} from "./event-revision.service.js";
import { getEnabledTopics } from "./topic-settings.service.js";

import {
  CROSS_SOURCE_KINDS,
  EVENT_SUMMARY_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  enabledTopicWhere,
  isEventTopic,
  type EventDetail,
  type EventFeedResult,
  type EventListItem,
  type EventListResult,
  type EventStatus,
  type EventTopic,
  type EventSignalRemoveResult,
  type EventTopicCount,
  type EventUpdateBody,
} from "../../shared/index.js";

import type { FollowMarker } from "./event.mapper.js";

/** 与前端可排序列一一对应（verify-module 会比对这两侧）。 */
const EVENT_SORTABLE_FIELDS = new Set([
  "last_activity_at",
  "first_seen_at",
  "heat_score",
  "recent_source_count",
  "signal_count",
]);

const HOUR_MS = 60 * 60 * 1000;
/** 「正在发生」按滚动 24 小时算，不按自然日——用户在任何时区打开看到的都是同一批事件。 */
const LIVE_WINDOW_HOURS = 24;
const RISING_WINDOW_HOURS = LIVE_WINDOW_HOURS;
const NOW_WINDOW_HOURS = LIVE_WINDOW_HOURS;
const RISING_LIMIT = 5;
const NOW_LIMIT = 10;

const LIST_SELECT = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  topic: true,
  kind: true,
  fact_version: true,
  fact_amount_text: true,
  fact_amount_usd: true,
  fact_duration_minutes: true,
  fact_resolved: true,
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

export interface EventViewerScope {
  tenant_id: string;
  user_id: string;
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
      toEventListItem(record, follows.get(record.id) ?? null),
    ),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

/**
 * 首页两个区块一次取回。
 *
 * 分两次请求会让首屏出现两段各自 loading 的骨架；而这两段本来就是同一个问题的
 * 两种切法：Rising 看正在变，Now 看还在发生。Now 排除 Rising，同一个事件不会在
 * 一屏里出现两次。
 *
 * 两段的排序键必须真的不同。曾经 Rising 排 velocity_pct、Now 排 heat_score，
 * 看着是两把尺子，但缺基线时 velocity_pct = heat_score * 100，两段排出同一串。
 * 现在 Rising 排「近窗有几个源在跟进」——跨源印证是可核对的事实，
 * 也正是「这件事正在扩散」与「这件事分数高」的真正区别。
 */
export async function getEventFeed(
  params: EventViewerScope & { topic?: EventTopic },
): Promise<EventFeedResult> {
  const now = Date.now();
  const enabled = await getEnabledTopics(params.tenant_id);
  const topicWhere = enabledTopicWhere(enabled, params.topic);
  const tenantWhere = withTenantScope(params.tenant_id, topicWhere);

  const rising = await prisma.newsEvent.findMany({
    where: {
      ...tenantWhere,
      status: { in: ["developing", "active"] },
      last_activity_at: { gte: new Date(now - RISING_WINDOW_HOURS * HOUR_MS) },
      recent_signal_count: { gt: 0 },
      // Rising 排的是跨源扩散，而 release / status / filing 恒为单来源——
      // 只有这些类型的事件放进来只会把真正在扩散的挤下去
      source_kinds: { hasSome: [...CROSS_SOURCE_KINDS] },
    },
    orderBy: [
      { recent_source_count: "desc" },
      { recent_signal_count: "desc" },
      { heat_score: "desc" },
    ],
    take: RISING_LIMIT,
    select: LIST_SELECT,
  });

  const risingIds = rising.map((event) => event.id);
  const nowEvents = await prisma.newsEvent.findMany({
    where: {
      ...tenantWhere,
      id: { notIn: risingIds },
      status: { in: ["developing", "active"] },
      last_activity_at: { gte: new Date(now - NOW_WINDOW_HOURS * HOUR_MS) },
    },
    orderBy: [{ heat_score: "desc" }, { last_activity_at: "desc" }],
    take: NOW_LIMIT,
    select: LIST_SELECT,
  });

  const follows = await loadFollowMarkers(params, [
    ...risingIds,
    ...nowEvents.map((event) => event.id),
  ]);
  const map = (records: typeof rising): EventListItem[] =>
    records.map((record) => toEventListItem(record, follows.get(record.id) ?? null));

  return {
    rising: map(rising),
    now: map(nowEvents),
  };
}

/** `event_id` 同时接受 uuid 与 slug——详情页 URL 用哪个都能开。 */
export async function getEventDetail(
  params: EventViewerScope & { event_id: string },
): Promise<EventDetail> {
  const record = await prisma.newsEvent.findFirst({
    where: withTenantScope(params.tenant_id, {
      OR: [{ id: params.event_id }, { slug: params.event_id }],
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
    throw new NotFoundError("events.not_found");
  }

  const [timeline, signals, follows] = await Promise.all([
    prisma.eventTimelineEntry.findMany({
      where: withTenantScope(params.tenant_id, { event_id: record.id }),
      orderBy: { occurred_at: "asc" },
      select: {
        id: true,
        occurred_at: true,
        label_code: true,
        label_text: true,
        source_kind: true,
        source_name: true,
        url: true,
        // 一手更新序列挂在信号上，靠它把两边接起来
        signal_id: true,
      },
    }),
    prisma.eventSignal.findMany({
      // removed_at 非空 = 工作台手动移除过，任何面上都不该再出现
      where: withTenantScope(params.tenant_id, {
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
        // 状态页那条 incident 的一手更新序列，嵌进对应的时间线格子
        incident_updates: true,
      },
    }),
    loadFollowMarkers(params, [record.id]),
  ]);

  const follow = follows.get(record.id) ?? null;
  // 关注过就从「上次查看」切起；没关注过没有个人基线，退回公开面那条 24h 窗口
  const revisions = await listEventRevisions({
    tenant_id: params.tenant_id,
    event_id: record.id,
    since: follow?.last_seen_at ?? publicRevisionSince(new Date()),
  });

  const [entities, related] = await Promise.all([
    listEventEntities({
      tenant_id: params.tenant_id,
      event_id: record.id,
      user_id: params.user_id,
    }),
    listRelatedEvents({
      tenant_id: params.tenant_id,
      related_ids: record.related_event_ids,
    }),
  ]);

  // 归位要先知道主实体是谁，所以排在 entities 之后而不是并进上面那批
  const placement = await getEventPlacementForDetail({
    tenant_id: params.tenant_id,
    event: record,
    entities,
  });

  return toEventDetail({
    record,
    timeline,
    signals,
    revisions,
    entities,
    related,
    placement,
    follow,
  });
}

/**
 * 工作台改标题 / 摘要 / 主题。
 *
 * 打上 `manual_content` 后，采集刷新仍会更新热度、阶段和时间线，但不再覆盖文案。
 */
export async function updateEvent(
  params: EventViewerScope & { event_id: string } & EventUpdateBody,
): Promise<EventDetail> {
  const existing = await prisma.newsEvent.findFirst({
    where: withTenantScope(params.tenant_id, {
      OR: [{ id: params.event_id }, { slug: params.event_id }],
    }),
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError("events.not_found");
  }

  const data: {
    title?: string;
    summary?: string;
    topic?: EventTopic;
    manual_content?: boolean;
    manual_topic?: boolean;
    analyzer?: string;
  } = {};

  if (params.title !== undefined) {
    const title = params.title.trim();
    if (!title) {
      throw new ValidationError("events.title_required");
    }
    if (title.length > EVENT_TITLE_MAX_LENGTH) {
      throw new ValidationError("events.title_too_long", {
        max: EVENT_TITLE_MAX_LENGTH,
      });
    }
    data.title = title;
  }

  if (params.summary !== undefined) {
    if (params.summary.length > EVENT_SUMMARY_MAX_LENGTH) {
      throw new ValidationError("events.summary_too_long", {
        max: EVENT_SUMMARY_MAX_LENGTH,
      });
    }
    data.summary = params.summary.trim();
  }

  if (params.topic !== undefined) {
    if (!isEventTopic(params.topic)) {
      throw new ValidationError("events.topic_invalid");
    }
    data.topic = params.topic;
    // 主题现在每轮由分类器重算，不锁住的话下一次采集就把人工判断覆盖掉了
    data.manual_topic = true;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError("events.update_empty");
  }

  if (data.title !== undefined || data.summary !== undefined) {
    data.manual_content = true;
    data.analyzer = "manual";
  }



  await prisma.newsEvent.update({
    where: { id: existing.id },
    data,
  });

  return getEventDetail({
    tenant_id: params.tenant_id,
    user_id: params.user_id,
    event_id: existing.id,
  });
}

/**
 * 工作台移除一条信号（`events.write`）。
 *
 * **软删，不是硬删。** 硬删的话源下一轮采集又把同一条抓回来了——运营点一次「移除」，
 * 15 分钟后它复活。留着行本身就是墓碑：采集的身份键会命中它，于是不再重建。
 *
 * 时间线那一格在这里**直接删**，不指望 refresh 顺手带走：`planAnalysis` 会给
 * 已有 LLM 产出、又没进热度窗口的事件判 `skip`，那一轮根本不生成 timeline，
 * 于是被移除的信号会在时间线上继续挂着。格子的键正是 (event_id, signal_id)，
 * 删它是一次精确操作，不需要重跑分析。
 *
 * 摘要与标题**不会**被自动重写（重写要花模型钱，且多数移除是在删重复项、
 * 文案本来就没受影响）。真需要改的用工作台的编辑面。
 */
export async function removeEventSignal(
  params: EventViewerScope & { event_id: string; signal_id: string },
): Promise<EventSignalRemoveResult & { signal_title: string }> {
  const event = await prisma.newsEvent.findFirst({
    where: withTenantScope(params.tenant_id, {
      OR: [{ id: params.event_id }, { slug: params.event_id }],
    }),
    select: { id: true },
  });
  if (!event) {
    throw new NotFoundError("events.not_found");
  }

  const signal = await prisma.eventSignal.findFirst({
    where: withTenantScope(params.tenant_id, {
      id: params.signal_id,
      event_id: event.id,
      removed_at: null,
    }),
    select: { id: true, title: true },
  });
  if (!signal) {
    throw new NotFoundError("events.signal_not_found");
  }

  await prisma.$transaction([
    prisma.eventSignal.update({
      where: { id: signal.id },
      data: { removed_at: new Date() },
    }),
    prisma.eventTimelineEntry.deleteMany({
      where: { event_id: event.id, signal_id: signal.id },
    }),
  ]);

  // 重算热度 / 阶段 / 计数 / source_names；移掉最后一条时事件本身也会被删掉
  await refreshEvents([event.id]);

  const survived = await prisma.newsEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });

  return {
    event_deleted: survived === null,
    event: survived
      ? await getEventDetail({
          tenant_id: params.tenant_id,
          user_id: params.user_id,
          event_id: event.id,
        })
      : null,
    signal_title: signal.title,
  };
}

/** 主题筛选条上的计数，只统计还「活着」的事件，避免陈年事件把数字撑大。 */
export async function listTopicCounts(
  tenantId: string,
): Promise<EventTopicCount[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * HOUR_MS);
  const rows = await prisma.newsEvent.groupBy({
    by: ["topic"],
    where: withTenantScope(tenantId, { last_activity_at: { gte: cutoff } }),
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

  return withTenantScope(params.tenant_id, {
    ...(params.topic ? { topic: params.topic } : {}),
    ...(params.status ? { status: params.status } : {}),
    ...(followingIds ? { id: { in: followingIds } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { summary: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
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
 * 关注是站点 + 用户态数据，必须显式带上租户谓词。
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
