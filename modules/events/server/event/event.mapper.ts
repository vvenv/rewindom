import type {
  EventDetail,
  EventListItem,
  EventSourceItem,
  EventSourceKind,
  EventStatus,
  EventTimelineItem,
  EventTopic,
} from "../../shared/index.js";

/** 卡片上的一句话说明：摘要太长时截断，摘要为空时回落到标题。 */
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
  record: EventRecordForList & { analyzer: string; analyzed_at: Date | null };
  timeline: TimelineRecord[];
  signals: SignalRecord[];
  follow?: FollowMarker | null;
}): EventDetail {
  return {
    ...toEventListItem(params.record, params.follow),
    summary: params.record.summary,
    analyzer: params.record.analyzer,
    analyzed_at: params.record.analyzed_at?.toISOString() ?? null,
    timeline: params.timeline.map(toTimelineItem),
    sources: groupSources(params.signals),
  };
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
  const source = summary.trim().length > 0 ? summary.trim() : title.trim();
  // 中文标点后面没有空格，不能和 ASCII 句号共用一条规则；
  // ASCII 的 `.` 又必须要求后随空白，否则 "example.com" 会被当成句末。
  const firstSentence = /^[\s\S]*?(?:[。！？]|[.!?](?=\s|$))/u
    .exec(source)?.[0]
    .trim();
  const candidate = firstSentence ?? source;
  return candidate.length <= HEADLINE_MAX_LENGTH
    ? candidate
    : `${candidate.slice(0, HEADLINE_MAX_LENGTH - 1).trimEnd()}…`;
}
