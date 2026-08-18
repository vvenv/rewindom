import { isEventRevisionKind } from "../../shared/index.js";

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
  status: string;
  heat_score: number;
  velocity_pct: number;
  has_velocity_baseline: boolean;
  recent_signal_count: number;
  recent_source_count: number;
  signal_count: number;
  source_count: number;
  source_names: string[];
  first_seen_at: Date;
  last_activity_at: Date;
}

export interface FollowMarker {
  last_seen_at: Date;
}

export function toEventListItem(
  record: EventRecordForList,
  follow?: FollowMarker | null,
): EventListItem {
  return {
    id: record.id,
    slug: record.slug,
    title: record.title,
    headline: buildHeadline(record.summary, record.title),
    topic: record.topic as EventTopic,
    status: record.status as EventStatus,
    heat_score: record.heat_score,
    velocity_pct: record.velocity_pct,
    has_velocity_baseline: record.has_velocity_baseline,
    recent_signal_count: record.recent_signal_count,
    recent_source_count: record.recent_source_count,
    signal_count: record.signal_count,
    source_count: record.source_count,
    source_names: record.source_names,
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
}

export interface SignalRecord {
  id: string;
  title: string;
  url: string;
  source_name: string;
  source_kind: string;
  published_at: Date;
  score: number;
  comment_count: number;
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
  follow?: FollowMarker | null;
}): EventDetail {
  const { record } = params;
  return {
    ...toEventListItem(record, params.follow),
    summary: record.summary,
    analyzer: record.analyzer,
    analyzed_at: record.analyzed_at?.toISOString() ?? null,
    manual_content: record.manual_content,
    manual_topic: record.manual_topic,
    timeline: params.timeline.map(toTimelineItem),
    sources: groupSources(params.signals),
    revisions: (params.revisions ?? []).flatMap(toRevisionItem),
    entities: (params.entities ?? []).map((record) => ({
      id: record.entity.id,
      name: record.entity.name,
      kind: record.entity.kind as EventEntityKind,
      mention_count: record.mention_count,
    })),
  };
}

export interface EntityRecord {
  mention_count: number;
  entity: { id: string; name: string; kind: string };
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

function toTimelineItem(record: TimelineRecord): EventTimelineItem {
  return {
    id: record.id,
    occurred_at: record.occurred_at.toISOString(),
    label_code: record.label_code,
    label_text: record.label_text,
    source_kind: record.source_kind as EventSourceKind,
    source_name: record.source_name,
    url: record.url,
  };
}

/**
 * 来源按 official / news / community 分组（MVP §4）。
 * 三个键恒定存在——界面按固定顺序渲染分组标题，空组自己决定要不要显示。
 */
export function groupSources(
  signals: readonly SignalRecord[],
): Record<EventSourceKind, EventSourceItem[]> {
  const grouped: Record<EventSourceKind, EventSourceItem[]> = {
    official: [],
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
