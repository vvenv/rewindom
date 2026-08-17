/**
 * 事件域的共享契约（server 与 client 同用）。
 *
 * 字段一律 snake_case（见 field-naming rule）；时间统一用 ISO 串，
 * 不在契约里出现 Date——序列化边界只有一处，就是 mapper。
 */

/** 事件所处阶段。MVP §7：让用户一眼知道「这件事现在到哪一步了」。 */
export const EVENT_STATUSES = [
  "developing",
  "active",
  "cooling",
  "resolved",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** MVP §10：先做这几个主题，不铺几十个分类。 */
export const EVENT_TOPICS = [
  "ai",
  "tech",
  "business",
  "world",
  "gaming",
  "entertainment",
  "sports",
] as const;
export type EventTopic = (typeof EVENT_TOPICS)[number];

/**
 * 来源分组。MVP §4 要求把来源摊开给用户看，并区分一手与讨论——
 * `official` 是当事方自己说的，`community` 是网友在讨论，二者不能混为一谈。
 */
export const EVENT_SOURCE_KINDS = ["official", "news", "community"] as const;
export type EventSourceKind = (typeof EVENT_SOURCE_KINDS)[number];

/** 首页三个区块。MVP §14：Rising 看变化，Now 看正在发生，Today 看今天全量。 */
export const EVENT_FEED_TABS = ["rising", "now", "today"] as const;
export type EventFeedTab = (typeof EVENT_FEED_TABS)[number];

export function isEventTopic(value: unknown): value is EventTopic {
  return (
    typeof value === "string" && (EVENT_TOPICS as readonly string[]).includes(value)
  );
}

export function isEventStatus(value: unknown): value is EventStatus {
  return (
    typeof value === "string" &&
    (EVENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isEventFeedTab(value: unknown): value is EventFeedTab {
  return (
    typeof value === "string" &&
    (EVENT_FEED_TABS as readonly string[]).includes(value)
  );
}

export function isEventSourceKind(value: unknown): value is EventSourceKind {
  return (
    typeof value === "string" &&
    (EVENT_SOURCE_KINDS as readonly string[]).includes(value)
  );
}

/** 一期两个 connector。加源时选 rss 填地址即可；hackernews 用内置端点。 */
export const EVENT_CONNECTORS = ["hackernews", "rss"] as const;
export type EventConnectorId = (typeof EVENT_CONNECTORS)[number];

export function isEventConnector(value: unknown): value is EventConnectorId {
  return (
    typeof value === "string" &&
    (EVENT_CONNECTORS as readonly string[]).includes(value)
  );
}

export const EVENT_TITLE_MAX_LENGTH = 300;
export const EVENT_SUMMARY_MAX_LENGTH = 8_000;
export const EVENT_FEED_NAME_MAX_LENGTH = 80;

/** 列表卡片。刻意只放卡片要用的字段，不把 summary 全文带进列表。 */
export interface EventListItem {
  id: string;
  slug: string;
  title: string;
  /** 一句话说明，由 summary 截断而来；与标题相同或摘要为空时是空串 */
  headline: string;
  topic: EventTopic;
  status: EventStatus;
  heat_score: number;
  velocity_pct: number;
  signal_count: number;
  source_count: number;
  /** 贡献过信号的源名，最多前 4 个，用于卡片上的「来源：X · Reddit · HN」 */
  source_names: string[];
  first_seen_at: string;
  last_activity_at: string;
  /** 当前用户是否已关注 */
  is_following: boolean;
  /** 已关注且上次查看后又有新动静 */
  has_update: boolean;
}

export interface EventTimelineItem {
  id: string;
  occurred_at: string;
  /** 与 label_text 二选一：code 走客户端 i18n，text 是 LLM 自由文案 */
  label_code: string | null;
  label_text: string | null;
  source_kind: EventSourceKind;
  source_name: string;
  url: string | null;
}

export interface EventSourceItem {
  id: string;
  title: string;
  url: string;
  source_name: string;
  source_kind: EventSourceKind;
  published_at: string;
  score: number;
  comment_count: number;
}

export interface EventDetail extends EventListItem {
  /** 「发生了什么」全文 */
  summary: string;
  /** heuristic | llm | manual——界面上要能看出这段摘要是谁写的 */
  analyzer: string;
  analyzed_at: string | null;
  /** 工作台改过标题/摘要后为 true，采集刷新不再覆盖文案 */
  manual_content: boolean;
  timeline: EventTimelineItem[];
  /** 按 source_kind 分组的来源证据 */
  sources: Record<EventSourceKind, EventSourceItem[]>;
}

export interface EventUpdateBody {
  title?: string;
  summary?: string;
  topic?: EventTopic;
}

/** 本站的一条采集源（工作台配置面）。 */
export interface EventFeedItem {
  id: string;
  connector: EventConnectorId;
  name: string;
  url: string;
  source_kind: EventSourceKind;
  topic: EventTopic;
  enabled: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
}

export interface EventFeedListResult {
  items: EventFeedItem[];
}

export interface EventFeedWriteBody {
  connector?: EventConnectorId;
  name?: string;
  url?: string;
  source_kind?: EventSourceKind;
  topic?: EventTopic;
  enabled?: boolean;
}

export interface EventListResult {
  items: EventListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

/** 首页一次取回三个区块，避免开三个请求各自 loading。 */
export interface EventFeedResult {
  rising: EventListItem[];
  now: EventListItem[];
  today: EventListItem[];
  /** 今天出现过动静的事件总数——首页「TODAY / 12 events」那一行 */
  today_total: number;
}

export interface EventTopicCount {
  topic: EventTopic;
  count: number;
}

export interface EventFollowState {
  is_following: boolean;
  has_update: boolean;
  last_seen_at: string | null;
}
