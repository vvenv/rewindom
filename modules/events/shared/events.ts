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

/** 首页两个区块。Rising 看正在变，Now 看还在发生。 */
export const EVENT_FEED_TABS = ["rising", "now"] as const;
export type EventFeedTab = (typeof EVENT_FEED_TABS)[number];

export function isEventTopic(value: unknown): value is EventTopic {
  return (
    typeof value === "string" && (EVENT_TOPICS as readonly string[]).includes(value)
  );
}

/** TenantSetting key：本站公开面启用哪些主题。 */
export const ENABLED_TOPICS_SETTING = "events.enabled_topics";

/**
 * 读路径：缺行 / 非法 / 空数组 → 全开。
 *
 * 失效方向必须在「多显示」一侧——解析坏了不该让整个页头消失。
 */
export function resolveEnabledTopics(value: unknown): EventTopic[] {
  if (!Array.isArray(value)) {
    return [...EVENT_TOPICS];
  }
  const enabled = EVENT_TOPICS.filter((topic) => value.includes(topic));
  return enabled.length > 0 ? enabled : [...EVENT_TOPICS];
}

/**
 * 写路径：丢掉非法项，至少留一格。空 / 非数组 → null（调用方 400）。
 */
export function parseEnabledTopicsInput(value: unknown): EventTopic[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const enabled = EVENT_TOPICS.filter((topic) => value.includes(topic));
  return enabled.length > 0 ? enabled : null;
}

export function isTopicEnabled(
  enabled: readonly EventTopic[],
  topic: EventTopic,
): boolean {
  return enabled.includes(topic);
}

export function allTopicsEnabled(enabled: readonly EventTopic[]): boolean {
  return enabled.length === EVENT_TOPICS.length;
}

/**
 * 列表谓词。指定了某一格就只查那一格（调用方先 404 关掉的格子）；
 * 未指定且未全开时收成 `in`，全开则不加 topic 条件——跟改之前同一条查询。
 */
export function enabledTopicWhere(
  enabled: readonly EventTopic[],
  requested?: EventTopic,
): { topic: EventTopic } | { topic: { in: EventTopic[] } } | Record<string, never> {
  if (requested) {
    return { topic: requested };
  }
  if (allTopicsEnabled(enabled)) {
    return {};
  }
  return { topic: { in: [...enabled] } };
}

export interface EventTopicSettings {
  enabled_topics: EventTopic[];
}

/** 真正会去抓的源：主题开着，且源自己也开着。 */
export function isFeedCollecting(
  feed: { enabled: boolean; topic: EventTopic },
  enabledTopics: readonly EventTopic[],
): boolean {
  return feed.enabled && isTopicEnabled(enabledTopics, feed.topic);
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

/**
 * 读入口：存量 `today` 并入 `now`。
 *
 * Today 曾经是 24h 全状态；Now 窗口已扩到 24h，仍只要 developing / active。
 * 库里的段设置和 `?source=today` 不能凭空失效。
 */
export function parseEventFeedTab(value: unknown): EventFeedTab | undefined {
  if (value === "today") {
    return "now";
  }
  return isEventFeedTab(value) ? value : undefined;
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
  /** 相对上一窗口的变化率。没有上一窗口时恒为 0，看下一个字段才知道 0 是哪种 0 */
  velocity_pct: number;
  /** false 表示「还说不出来」而不是「持平」——界面必须区分这两者 */
  has_velocity_baseline: boolean;
  /** 近窗（6h）内的信号条数 */
  recent_signal_count: number;
  /** 近窗内贡献过信号的不同来源数。Rising 就是按它排的 */
  recent_source_count: number;
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

/**
 * 卡片上那个角标要主张什么。
 *
 * `rising` / `falling` 是比率，只有在**存在可比较的上一窗口**时才成立。
 * `spreading` 是事实：近窗里有几个不同来源在跟进——新事件没有基线可比，
 * 但「三家在报同一件事」本身就是最强的信号，而且可核对。
 *
 * 返回 null = 什么都不渲染。没有可主张的变化时留白比写「持平」更权威
 *（公开面 SSR 与工作台同口径）。
 */
export type EventMomentumKind = "rising" | "falling" | "spreading";

export interface EventMomentum {
  kind: EventMomentumKind;
  /** rising / falling 用：变化率绝对值，已取整 */
  percent: number;
  /** spreading 用：近窗内的不同来源数 */
  source_count: number;
}

/** 小于这个幅度当作没变——采集抖动不值得在卡片上写一笔。 */
const STEADY_THRESHOLD_PCT = 5;
/** 单个来源不叫「扩散」，那只是一条帖子。 */
const SPREADING_MIN_SOURCES = 2;

export function describeEventMomentum(item: {
  velocity_pct: number;
  has_velocity_baseline: boolean;
  recent_source_count: number;
}): EventMomentum | null {
  if (item.has_velocity_baseline) {
    if (Math.abs(item.velocity_pct) < STEADY_THRESHOLD_PCT) {
      return null;
    }
    return {
      kind: item.velocity_pct > 0 ? "rising" : "falling",
      percent: Math.round(Math.abs(item.velocity_pct)),
      source_count: item.recent_source_count,
    };
  }

  if (item.recent_source_count >= SPREADING_MIN_SOURCES) {
    return {
      kind: "spreading",
      percent: 0,
      source_count: item.recent_source_count,
    };
  }

  return null;
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

/**
 * 一条「自上次查看后发生了什么」。
 *
 * 竞品给不出这个：每轮重新聚类的产品没有连续观察记录，事后补算不出来。
 * `payload` 是扁平标量映射，渲染层直接读，不必解析嵌套结构。
 */
export const EVENT_REVISION_KINDS = [
  "source_joined",
  "status_changed",
  "summary_rewritten",
  "title_changed",
] as const;
export type EventRevisionKind = (typeof EVENT_REVISION_KINDS)[number];

export interface EventRevisionItem {
  kind: EventRevisionKind;
  occurred_at: string;
  before: Record<string, string | number | boolean | null> | null;
  after: Record<string, string | number | boolean | null>;
}

export function isEventRevisionKind(value: unknown): value is EventRevisionKind {
  return (
    typeof value === "string" &&
    (EVENT_REVISION_KINDS as readonly string[]).includes(value)
  );
}

/**
 * 事件里的一个实体。
 *
 * 事件是易逝的，实体不是——这是把「一次性阅读」变成「持续订阅」的支点。
 * `mention_count` 是排序权重，不是「重要性」的断言。
 */
export const EVENT_ENTITY_KINDS = [
  "company",
  "product",
  "person",
  "place",
  "org",
] as const;
export type EventEntityKind = (typeof EVENT_ENTITY_KINDS)[number];

export interface EventEntityItem {
  id: string;
  name: string;
  kind: EventEntityKind;
  mention_count: number;
  /** 实体页地址用的 slug */
  slug: string;
  /** 当前用户是否已关注这个实体 */
  is_following: boolean;
}

export interface EventDetail extends EventListItem {
  /** 「发生了什么」全文 */
  summary: string;
  /** heuristic | llm | manual——界面上要能看出这段摘要是谁写的 */
  analyzer: string;
  analyzed_at: string | null;
  /** 工作台改过标题/摘要后为 true，采集刷新不再覆盖文案 */
  manual_content: boolean;
  /** 工作台指定过主题后为 true，分类器不再覆盖它 */
  manual_topic: boolean;
  timeline: EventTimelineItem[];
  /** 按 source_kind 分组的来源证据 */
  sources: Record<EventSourceKind, EventSourceItem[]>;
  /**
   * 自上次查看后的变化（未关注 / 公开面则是最近 24h）。
   * 空数组 = 这段时间没有可主张的变化。
   */
  revisions: EventRevisionItem[];
  /** 事件涉及的实体，按提及次数降序 */
  entities: EventEntityItem[];
  /**
   * 相关事件（不是同一件事，但有关系），按相似度降序，最多 5 条。
   * 没配 embedding key 时恒为空——界面整块不渲染。
   */
  related: EventRelatedItem[];
  /** 「为什么在扩散」。说不清楚时是空数组，界面整块不渲染 */
  why_trending: EventTrendingFactor[];
}

/**
 * 「为什么在扩散」的一条事实。
 *
 * **不是解释，是事实**：谁最先说、几家跟进、只有社区在聊。
 * `confidence` 必须分开标——把讨论热度当成事情本身，正是这个产品要避免的。
 * 文案由 `code` + `params` 在渲染层解析，不让模型产出自由文案。
 */
export type EventTrendingConfidence = "confirmed" | "discussion";

export interface EventTrendingFactor {
  code: string;
  params: Record<string, string | number>;
  confidence: EventTrendingConfidence;
}

/** 相关事件卡片。只放跳转要用的字段，不把整条事件带进来。 */
export interface EventRelatedItem {
  id: string;
  slug: string;
  title: string;
  topic: EventTopic;
  status: EventStatus;
  last_activity_at: string;
}

export interface EventUpdateBody {
  title?: string;
  summary?: string;
  topic?: EventTopic;
}

/**
 * 移除一条信号的结果。
 *
 * 移掉最后一条信号时事件本身也没了（`refreshEvents` 不留空壳），
 * 前端要据此跳回列表而不是渲染一个 404 详情。
 */
export interface EventSignalRemoveResult {
  event_deleted: boolean;
  event: EventDetail | null;
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

/** 首页一次取回两个区块，避免开两个请求各自 loading。 */
export interface EventFeedResult {
  rising: EventListItem[];
  now: EventListItem[];
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

/**
 * 关注实体的状态。
 *
 * 与事件的 `has_update`（布尔）不同，实体给的是**数量**：事件只有「有没有新动静」，
 * 实体是一个持续的订阅面，「新增了 3 件事」比「有更新」有用得多。
 */
export interface EventEntityFollowState {
  is_following: boolean;
  /** 上次查看之后这个实体新关联上的事件数 */
  new_event_count: number;
  last_seen_at: string | null;
}
