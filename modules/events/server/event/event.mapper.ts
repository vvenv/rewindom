import { isEventKind, isEventRevisionKind, isEventSourceKind } from "../../shared/index.js";
import {
  resolveSourceIconUrl,
  sourceIconUrlsForNames,
} from "../../shared/source-icon.js";

import type {
  EventIncidentUpdate,
  EventPlacementFact,
} from "../../shared/index.js";

import { computeWhyTrending } from "./why-trending.js";

import type {
  EventDetail,
  EventEntityKind,
  EventListItem,
  EventRevisionItem,
  EventSourceItem,
  EventSourceKind,
  EventStatus,
  EventTimelineItem,
  EventTopic,
} from "../../shared/index.js";

/** 卡片上的一句话说明：摘要太长时截断。没有比标题多出来的信息就留空，别再画一遍。 */
const HEADLINE_MAX_LENGTH = 160;

export interface EventRecordForList {
  id: string;
  slug: string;
  title: string;
  summary: string;
  topic: string;
  kind: string | null;
  fact_version: string | null;
  fact_amount_text: string | null;
  fact_amount_usd: number | null;
  fact_duration_minutes: number | null;
  fact_resolved: boolean | null;
  status: string;
  heat_score: number;
  velocity_pct: number;
  has_velocity_baseline: boolean;
  recent_signal_count: number;
  recent_source_count: number;
  signal_count: number;
  source_count: number;
  source_names: string[];
  source_kinds: string[];
  first_seen_at: Date;
  last_activity_at: Date;
}

export interface FollowMarker {
  last_seen_at: Date;
}

export function toEventListItem(
  record: EventRecordForList,
  follow?: FollowMarker | null,
  sourceIcons?: ReadonlyMap<string, string>,
  placement: readonly EventPlacementFact[] = [],
): EventListItem {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    headline: buildHeadline(record.summary, record.title),
    topic: record.topic as EventTopic,
    kind: isEventKind(record.kind) ? record.kind : null,
    facts: {
      version: record.fact_version,
      amount_text: record.fact_amount_text,
      amount_usd: record.fact_amount_usd,
      duration_minutes: record.fact_duration_minutes,
      resolved: record.fact_resolved,
    },
    status: record.status as EventStatus,
    heat_score: record.heat_score,
    velocity_pct: record.velocity_pct,
    has_velocity_baseline: record.has_velocity_baseline,
    recent_signal_count: record.recent_signal_count,
    recent_source_count: record.recent_source_count,
    signal_count: record.signal_count,
    source_count: record.source_count,
    source_names: record.source_names,
    source_icon_urls: sourceIconUrlsForNames(record.source_names, sourceIcons),
    source_kinds: record.source_kinds.filter(isEventSourceKind),
    placement: [...placement],
    first_seen_at: record.first_seen_at.toISOString(),
    last_activity_at: record.last_activity_at.toISOString(),
    is_following: Boolean(follow),
    has_update: Boolean(
      follow && record.last_activity_at.getTime() > follow.last_seen_at.getTime(),
    ),
  };
}

export interface TimelineRecord {
  id: string;
  occurred_at: Date;
  label_code: string | null;
  label_text: string | null;
  source_kind: string;
  source_name: string;
  url: string | null;
  /** DB 列可空（存量行），但新写入的格子一定带它 */
  signal_id: string | null;
}

export interface SignalRecord {
  id: string;
  title: string;
  url: string;
  source_name: string;
  source_kind: string;
  connector?: string;
  published_at: Date;
  score: number;
  comment_count: number;
  /** Prisma 的 Json 列，形状不保证——`toIncidentUpdates` 会浅校验 */
  incident_updates?: unknown;
}

export function toEventDetail(params: {
  record: EventRecordForList & {
    analyzer: string;
    analyzed_at: Date | null;
    manual_content: boolean;
    manual_topic: boolean;
  };
  timeline: TimelineRecord[];
  signals: SignalRecord[];
  revisions?: RevisionRecord[];
  entities?: EntityRecord[];
  related?: RelatedRecord[];
  /** 归位。没抽到实体时是空数组，界面整块不渲染 */
  placement?: EventPlacementFact[];
  follow?: FollowMarker | null;
  /** 只有测试会显式传；生产恒为当下 */
  now?: Date;
  /** 本站采集源 name → 本站 icon 路径 */
  sourceIcons?: ReadonlyMap<string, string>;
  /** 索引未命中时的取图地址。工作台绑 API 路径。 */
  iconToUrl?: (host: string) => string;
}): EventDetail {
  const { record } = params;
  // 更新序列挂在信号上、时间线格子按 signal_id 认领它——两边本来就在同一批查询里
  const updatesBySignal = new Map(
    params.signals.map((signal) => [
      signal.id,
      toIncidentUpdates(signal.incident_updates),
    ]),
  );
  const connectorBySignal = new Map(
    params.signals
      .filter((signal) => signal.connector)
      .map((signal) => [signal.id, signal.connector!]),
  );
  return {
    ...toEventListItem(
      record,
      params.follow,
      params.sourceIcons,
      params.placement ?? [],
    ),
    summary: record.summary,
    analyzer: record.analyzer,
    analyzed_at: record.analyzed_at?.toISOString() ?? null,
    manual_content: record.manual_content,
    manual_topic: record.manual_topic,
    timeline: params.timeline.map((entry) =>
      toTimelineItem(
        entry,
        updatesBySignal,
        connectorBySignal,
        params.sourceIcons,
        params.iconToUrl,
      ),
    ),
    sources: groupSources(params.signals, params.sourceIcons, params.iconToUrl),
    revisions: (params.revisions ?? []).flatMap(toRevisionItem),
    why_trending: computeWhyTrending({
      signals: params.signals.map((signal) => ({
        source_name: signal.source_name,
        source_kind: signal.source_kind as EventSourceKind,
        published_at: signal.published_at,
      })),
      now: params.now ?? new Date(),
    }),
    related: (params.related ?? []).map((record) => ({
      id: record.id,
      slug: record.slug,
      title: record.title,
      topic: record.topic as EventTopic,
      status: record.status as EventStatus,
      last_activity_at: record.last_activity_at.toISOString(),
    })),
    entities: (params.entities ?? []).map((record) => ({
      id: record.entity.id,
      name: record.entity.name,
      kind: record.entity.kind as EventEntityKind,
      slug: record.entity.slug,
      mention_count: record.mention_count,
      // 未登录（公开面）时恒为 false：关注是登录态
      is_following: record.is_following ?? false,
    })),
  };
}

export interface RelatedRecord {
  id: string;
  slug: string;
  title: string;
  topic: string;
  status: string;
  last_activity_at: Date;
}

export interface EntityRecord {
  mention_count: number;
  entity: { id: string; name: string; kind: string; slug: string };
  /** 公开面没有 viewer，这一项缺省即可 */
  is_following?: boolean;
}

export interface RevisionRecord {
  kind: string;
  before: unknown;
  after: unknown;
  occurred_at: Date;
}

/**
 * 修订行 → 视图。库里的 `kind` 是自由字符串（Json 列旁边的一个 text 列），
 * 枚举外的值直接丢掉而不是硬转——旧行或将来新增的类型不该让详情页崩掉。
 */
function toRevisionItem(record: RevisionRecord): EventRevisionItem[] {
  if (!isEventRevisionKind(record.kind)) {
    return [];
  }
  return [
    {
      kind: record.kind,
      occurred_at: record.occurred_at.toISOString(),
      before: asPayload(record.before),
      after: asPayload(record.after) ?? {},
    },
  ];
}

function asPayload(
  value: unknown,
): Record<string, string | number | boolean | null> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, string | number | boolean | null>;
}

function toTimelineItem(
  record: TimelineRecord,
  updatesBySignal: ReadonlyMap<string, EventIncidentUpdate[]>,
  connectorBySignal: ReadonlyMap<string, string>,
  sourceIcons?: ReadonlyMap<string, string>,
  iconToUrl?: (host: string) => string,
): EventTimelineItem {
  return {
    id: record.id,
    occurred_at: record.occurred_at.toISOString(),
    label_code: record.label_code,
    label_text: record.label_text,
    source_kind: record.source_kind as EventSourceKind,
    source_name: record.source_name,
    icon_url: resolveSourceIconUrl({
      name: record.source_name,
      url: record.url,
      connector: record.signal_id
        ? connectorBySignal.get(record.signal_id)
        : undefined,
      icons: sourceIcons,
      toUrl: iconToUrl,
    }),
    url: record.url,
    incident_updates:
      (record.signal_id ? updatesBySignal.get(record.signal_id) : null) ?? [],
  };
}

/**
 * Prisma 的 Json 列回来是 `unknown`。校验刻意浅：形状不对整条弃权，
 * 落回「没有更新序列」而不是抛错——一条脏数据不该让详情页整页打不开。
 */
function toIncidentUpdates(value: unknown): EventIncidentUpdate[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is EventIncidentUpdate =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as EventIncidentUpdate).occurred_at === "string" &&
      typeof (item as EventIncidentUpdate).phase === "string" &&
      typeof (item as EventIncidentUpdate).text === "string",
  );
}

/**
 * 来源按 source_kind 分组（MVP §4）。
 * **每个键都必须初始化成 []**——漏一个，公开面 `detail.sources[kind].map` 会在
 * undefined 上炸，而且只在该类型首次出现时才炸。渲染顺序见 SOURCE_KIND_ORDER，
 * 空组由两侧各自过滤掉。
 */
export function groupSources(
  signals: readonly SignalRecord[],
  sourceIcons?: ReadonlyMap<string, string>,
  iconToUrl?: (host: string) => string,
): Record<EventSourceKind, EventSourceItem[]> {
  const grouped: Record<EventSourceKind, EventSourceItem[]> = {
    official: [],
    release: [],
    status: [],
    filing: [],
    news: [],
    community: [],
  };

  for (const signal of signals) {
    const kind = signal.source_kind as EventSourceKind;
    if (!grouped[kind]) {
      continue;
    }
    grouped[kind].push({
      id: signal.id,
      title: signal.title,
      url: signal.url,
      source_name: signal.source_name,
      source_kind: kind,
      icon_url: resolveSourceIconUrl({
        name: signal.source_name,
        url: signal.url,
        connector: signal.connector,
        icons: sourceIcons,
        toUrl: iconToUrl,
      }),
      published_at: signal.published_at.toISOString(),
      score: signal.score,
      comment_count: signal.comment_count,
    });
  }

  return grouped;
}

export function buildHeadline(summary: string, title: string): string {
  let source = summary.trim();
  if (source.length === 0) {
    return "";
  }

  const first = takeFirstSentence(source);
  // RSS 摘录经常以标题开篇；那句不是新信息，副标题改取后面一句。
  if (isSameAsTitle(first.sentence, title)) {
    source = first.rest;
    if (source.length === 0) {
      return "";
    }
  }

  const candidate = takeFirstSentence(source).sentence;
  const headline =
    candidate.length <= HEADLINE_MAX_LENGTH
      ? candidate
      : `${candidate.slice(0, HEADLINE_MAX_LENGTH - 1).trimEnd()}…`;
  return isSameAsTitle(headline, title) ? "" : headline;
}

function takeFirstSentence(source: string): { sentence: string; rest: string } {
  // 中文标点后面没有空格，不能和 ASCII 句号共用一条规则；
  // ASCII 的 `.` 又必须要求后随空白，否则 "example.com" 会被当成句末。
  const match = /^[\s\S]*?(?:[。！？]|[.!?](?=\s|$))/u.exec(source);
  if (!match) {
    return { sentence: source, rest: "" };
  }
  return {
    sentence: match[0].trim(),
    rest: source.slice(match[0].length).trim(),
  };
}

function isSameAsTitle(headline: string, title: string): boolean {
  return normalizeHeadline(headline) === normalizeHeadline(title);
}

function normalizeHeadline(value: string): string {
  return value
    .trim()
    .replace(/[。！？.!?…]+$/u, "")
    .trim()
    .toLowerCase();
}
