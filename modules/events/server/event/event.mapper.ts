import {
  hasLocaleText,
  resolveEventLocaleText,
} from "../../shared/index.js";

import type {
  EventDetail,
  EventListItem,
  EventSourceItem,
  EventSourceKind,
  EventStatus,
  EventTimelineItem,
  EventTopic,
} from "../../shared/index.js";
import type { AppLocale } from "@rewindom/module-sdk";

/** 卡片上的一句话说明：摘要太长时截断，摘要为空时回落到标题。 */
const HEADLINE_MAX_LENGTH = 160;

export interface EventRecordForList {
  id: string;
  slug: string;
  /** 原文标题 */
  title: string;
  /** 原文摘要 */
  summary: string;
  origin_locale: string;
  title_i18n: unknown;
  summary_i18n: unknown;
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

/**
 * 落成某一语言的列表项。
 *
 * 语言在**读取时**解析，不在写入时定死：同一条事件会被中文访客与英文访客各读一次，
 * 库里存的始终是整张语言表（docs/design/i18n.md 的数据多语言口径）。
 */
export function toEventListItem(
  record: EventRecordForList,
  locale: AppLocale,
  follow?: FollowMarker | null,
): EventListItem {
  const title = resolveEventLocaleText(record.title_i18n, locale, record.title);
  const summary = resolveEventLocaleText(
    record.summary_i18n,
    locale,
    record.summary,
  );

  return {
    id: record.id,
    slug: record.slug,
    title,
    headline: buildHeadline(summary, title),
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
    origin_locale: record.origin_locale,
    is_translated: isTranslated(record.title_i18n, record.origin_locale, locale),
  };
}

/**
 * 「显示的是译文吗」——两个条件都要满足：请求语言不是原文语种，且该语言**真有**译文。
 * 只判语言不同会把「回落到原文」也标成译文，那是在撒谎。
 */
function isTranslated(
  map: unknown,
  originLocale: string,
  locale: AppLocale,
): boolean {
  return locale !== originLocale && hasLocaleText(map, locale);
}

export interface TimelineRecord {
  id: string;
  occurred_at: Date;
  label_code: string | null;
  label_text: string | null;
  label_text_i18n: unknown;
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
  locale: AppLocale;
  timeline: TimelineRecord[];
  signals: SignalRecord[];
  follow?: FollowMarker | null;
}): EventDetail {
  const { record, locale } = params;
  return {
    ...toEventListItem(record, locale, params.follow),
    summary: resolveEventLocaleText(record.summary_i18n, locale, record.summary),
    summary_translated: isTranslated(
      record.summary_i18n,
      record.origin_locale,
      locale,
    ),
    analyzer: record.analyzer,
    analyzed_at: record.analyzed_at?.toISOString() ?? null,
    timeline: params.timeline.map((entry) => toTimelineItem(entry, locale)),
    sources: groupSources(params.signals),
  };
}

function toTimelineItem(
  record: TimelineRecord,
  locale: AppLocale,
): EventTimelineItem {
  return {
    id: record.id,
    occurred_at: record.occurred_at.toISOString(),
    label_code: record.label_code,
    // 自由文案按语言表解析；code 那条路不走这里（两端各自带译文）
    label_text: record.label_text
      ? resolveEventLocaleText(record.label_text_i18n, locale, record.label_text)
      : null,
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
