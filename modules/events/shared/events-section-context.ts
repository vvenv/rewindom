/**
 * 官网段的按请求数据（走 `SectionRenderContext.contributed["events"]`）。
 *
 * 形状是**已经落成当前语言的视图**，不是领域对象：段渲染器是同步的，也拿不到 i18n，
 * 所以时间线的 `label` 在建上下文时就解析好（SSR 用模块 locale JSON，编辑器预览用
 * i18next），两端各解析一次但用的是同一份文案。
 */

import { isReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

import {
  isEventSourceKind,
  isEventTopic,
  parseEventFeedTab,
  type EventFeedTab,
  type EventSourceKind,
  type EventIncidentUpdate,
  type EventStatus,
  type EventTopic,
} from "./events.js";

export const EVENTS_CONTEXT_KEY = "events";

/**
 * 模块挂载前缀，也是模板页身份。公开 URL 是否收到站点根，看
 * `eventsMountedAtRoot`（版式 `events.home` 或存量 `home_path=/events`）。
 */
export const EVENTS_INDEX_PATH = "/events";

/** 与 `registerHomeLayout` 的 key 一致。 */
export const EVENTS_HOME_LAYOUT_KEY = "events.home";

export interface EventsHomeMount {
  homePath?: string;
  homeLayoutKey?: string;
}

function normalizeMountPath(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 1 && withSlash.endsWith("/")
    ? withSlash.slice(0, -1)
    : withSlash;
}

/**
 * 公开面把事件收到站点根：选了事件雷达版式且首页仍是 `/`，
 * 或存量把 `/events` 设为了 `home_path`。
 */
export function eventsMountedAtRoot(input: EventsHomeMount = {}): boolean {
  const path = normalizeMountPath(input.homePath);
  if (path === EVENTS_INDEX_PATH) return true;
  return path === "/" && input.homeLayoutKey === EVENTS_HOME_LAYOUT_KEY;
}

/** 公开枢纽地址：首页挂载时是 `/`，否则是 `/events`。 */
export function eventsIndexPath(input: EventsHomeMount = {}): string {
  return eventsMountedAtRoot(input) ? "/" : EVENTS_INDEX_PATH;
}

function joinIndex(indexPath: string, rest: string): string {
  if (indexPath === "/") return rest.startsWith("/") ? rest : `/${rest}`;
  return `${indexPath}${rest.startsWith("/") ? rest : `/${rest}`}`;
}

export function eventPath(
  slug: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(indexPath, `/${encodeURIComponent(slug)}`);
}

/**
 * 主题枢纽地址。页头高亮靠 `currentPath` 精确匹配，所以 topic 必须是路径段
 *（`/events/ai`），不能是 `?topic=`。格子是编译期枚举，事件 slug 恒带 id 后缀，
 * 两者不会撞。
 */
export function topicPath(
  topic: EventTopic,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(indexPath, `/${topic}`);
}

/**
 * 实体页地址。
 *
 * 默认走 `/events/entity/:slug`。事件枢纽当首页时收到 `/entity/:slug`：
 * 事件 slug 永远是一段，实体路径恒为两段且首段是 `entity`，两者不会撞。
 */
export const EVENTS_ENTITY_SEGMENT = "entity";

export function entityPath(
  slug: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(
    indexPath,
    `/${EVENTS_ENTITY_SEGMENT}/${encodeURIComponent(slug)}`,
  );
}

function entityPrefix(indexPath: string): string {
  return indexPath === "/"
    ? `/${EVENTS_ENTITY_SEGMENT}/`
    : `${indexPath}/${EVENTS_ENTITY_SEGMENT}/`;
}

/**
 * 订阅地址。
 *
 * 这个产品一直在消费 RSS，现在也产出 RSS——订阅是留存的第三条腿：
 * 关注事件（易逝）、关注实体（登录态）、订阅 feed（**不需要账号**）。
 */
export function eventsFeedPath(topic?: EventTopic): string {
  const base = `${EVENTS_INDEX_PATH}/feed.xml`;
  return topic ? `${base}?topic=${encodeURIComponent(topic)}` : base;
}

export function entityFeedPath(slug: string): string {
  return `${entityPath(slug)}/feed.xml`;
}

/** 从路径里取实体 slug；不是实体路径时返回 null。 */
export function entitySlugFromPath(
  path: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string | null {
  const prefix = entityPrefix(indexPath);
  if (!path.startsWith(prefix)) {
    return null;
  }
  const rest = path.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/")
    ? decodeURIComponent(rest)
    : null;
}

/** 枢纽下的单段（详情 slug 或主题格子）；实体路径、枢纽本身、更深路径返回 null。 */
function singleSegmentFromPath(
  path: string,
  indexPath: string,
): string | null {
  if (entitySlugFromPath(path, indexPath) !== null) return null;
  if (path === indexPath) return null;
  if (indexPath === "/") {
    if (!path.startsWith("/") || path.includes("/", 1)) return null;
    const slug = path.slice(1);
    if (!slug || isReservedPageSlug(slug)) return null;
    return decodeURIComponent(slug);
  }
  if (!path.startsWith(`${indexPath}/`)) return null;
  const rest = path.slice(indexPath.length + 1);
  return rest.length > 0 && !rest.includes("/")
    ? decodeURIComponent(rest)
    : null;
}

/** 从路径里取主题格子；不是枚举里的那一格返回 null。 */
export function topicFromPath(
  path: string,
  indexPath: string = EVENTS_INDEX_PATH,
): EventTopic | null {
  const slug = singleSegmentFromPath(path, indexPath);
  return slug && isEventTopic(slug) ? slug : null;
}

/** 从路径里取事件 slug；枢纽、主题格子、实体路径或保留段返回 null。 */
export function eventSlugFromPath(
  path: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string | null {
  const slug = singleSegmentFromPath(path, indexPath);
  if (slug === null || isEventTopic(slug)) return null;
  return slug;
}

export type EventsPublicRoute =
  | { type: "index" }
  | { type: "topic"; topic: EventTopic }
  | { type: "event"; slug: string }
  | { type: "entity"; slug: string };

export function parseEventsPublicPath(
  path: string,
  indexPath: string = EVENTS_INDEX_PATH,
): EventsPublicRoute | null {
  if (path === indexPath) return { type: "index" };
  /*
   * RSS 由模块自己的 Fastify 路由发（path handler 只能回 HTML，控制不了 content-type）。
   * 那条静态路由在 find-my-way 里本来就优先于 marketing 的 `/*`，但这里也明确让开：
   * 否则一旦注册顺序变了，`/events/feed.xml` 会被当成 slug 为 `feed.xml` 的事件详情，
   * 静默变成 404。
   */
  if (path.endsWith("/feed.xml")) return null;
  const entitySlug = entitySlugFromPath(path, indexPath);
  if (entitySlug !== null) return { type: "entity", slug: entitySlug };
  const topic = topicFromPath(path, indexPath);
  if (topic !== null) return { type: "topic", topic };
  const slug = eventSlugFromPath(path, indexPath);
  if (slug !== null) return { type: "event", slug };
  return null;
}

/**
 * 请求路径 → 事件路由。先认 `/events` 前缀（含首页挂载后的旧地址），
 * 再在挂到根上时认 `/:topic`、`/:slug` 与 `/entity/:slug`。
 */
export function parseEventsRequestPath(
  path: string,
  atRoot: boolean,
): EventsPublicRoute | null {
  const prefixed = parseEventsPublicPath(path, EVENTS_INDEX_PATH);
  if (prefixed) return prefixed;
  if (!atRoot) return null;
  return parseEventsPublicPath(path, "/");
}

/**
 * 首页挂载时，把旧 `/events` 前缀剥成规范地址；不是旧前缀则 null。
 * `/events` → `/`，`/events/foo` → `/foo`。
 */
export function stripEventsMountedPrefix(path: string): string | null {
  if (path === EVENTS_INDEX_PATH) return "/";
  if (path.startsWith(`${EVENTS_INDEX_PATH}/`)) {
    const rest = path.slice(EVENTS_INDEX_PATH.length);
    return rest.length > 0 ? rest : "/";
  }
  return null;
}

/** 首页挂载且当前是旧前缀时，返回 301 目标（逻辑路径，不含 locale）。 */
export function eventsCanonicalLocation(
  path: string,
  mount: EventsHomeMount = {},
  query: Record<string, string> = {},
): string | null {
  const stripped = eventsMountedAtRoot(mount)
    ? stripEventsMountedPrefix(path)
    : null;
  const logical = stripped ?? path;
  const topic = parseEventsIndexQuery(query).topic;
  if (!topic) return stripped;
  const route = parseEventsRequestPath(
    logical,
    eventsMountedAtRoot(mount),
  );
  if (route?.type !== "index") return stripped;
  return topicPath(topic, eventsIndexPath(mount));
}

/**
 * 版式挂在站点根时，`/` 本身仍由首页 CMS 渲染；带 `source` 的查询
 * 才交给事件 handler（列表页）。主题落地是 `/:topic` 路径段，不是查询串。
 * 旧 `?topic=` 仍接管，避免已分享的地址直接掉回未过滤首页。
 */
export function isEventsRootQueryTakeover(
  path: string,
  query: Record<string, string>,
  mount: EventsHomeMount = {},
): boolean {
  if (path !== "/" || !eventsMountedAtRoot(mount)) return false;
  const parsed = parseEventsIndexQuery(query);
  return parsed.source !== undefined || parsed.topic !== undefined;
}

/**
 * 首页两段 + 查询列表共用的查询串：`source` 是哪一批，`topic` 与 `kind` 可选。
 *
 * `kind` 按来源类型筛（`?kind=release` = 只看发布公告）。它**只在列表视图生效**，
 * 也刻意不参与 `isEventsRootQueryTakeover`——单独一个 `?kind=` 不该把站点首页
 * 从 CMS 手里抢走。
 */
export interface EventsIndexQuery {
  source?: EventFeedTab;
  topic?: EventTopic;
  kind?: EventSourceKind;
}

/** 非法值一律当没传，不报错：公开面不因为一个查询参数长得不对就给访客 404。 */
export function parseEventsIndexQuery(
  query: Record<string, string>,
): EventsIndexQuery {
  return {
    source: parseEventFeedTab(query.source),
    topic: isEventTopic(query.topic) ? query.topic : undefined,
    kind: isEventSourceKind(query.kind) ? query.kind : undefined,
  };
}

/**
 * 事件首页地址。topic 走路径段（页头才能高亮）；`source` 仍是查询——
 * 它不是导航项，完整列表不必占一条路径。
 * 「查看全部」必须带上当前区块的 source，否则会回到枢纽把自己再画一遍。
 */
export function eventsIndexHref(
  query: EventsIndexQuery = {},
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  const base = query.topic ? topicPath(query.topic, indexPath) : indexPath;
  const params = new URLSearchParams();
  if (query.source) {
    params.set("source", query.source);
  }
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

/** 有合法 `source` 就是查询列表页；只有 topic 或什么都没有仍是两段枢纽。 */
export function isEventsIndexListing(
  query: EventsIndexQuery,
): query is EventsIndexQuery & { source: EventFeedTab } {
  return query.source !== undefined;
}

/**
 * `/events`、`/events/:topic`、`/events/:slug` 与 `/events/entity/:slug`。
 *
 * 这是**挂载前缀**上的匹配，与是否把枢纽设为首页无关——旧地址始终由这条
 * handler 接住，再 301 到根上。根上的 `/:topic` / `/:slug` 走 fallback，见
 * `isEventsRootFallbackPath`。
 */
export function isEventsPath(path: string): boolean {
  return parseEventsPublicPath(path, EVENTS_INDEX_PATH) !== null;
}

/**
 * 枢纽当首页时，CMS 未命中后认领的路径：`/:topic`、`/:slug` 与 `/entity/:slug`。
 * `/` 本身由首页 CMS 渲染（或存量 home_path 改写），不走这里。
 */
export function isEventsRootFallbackPath(path: string): boolean {
  if (path === "/") return false;
  return parseEventsPublicPath(path, "/") !== null;
}

export interface PublicEventCard {
  slug: string;
  href: string;
  title: string;
  /** 一句话说明；与标题相同或没有摘要时为空，渲染侧直接跳过 */
  headline: string;
  topic: EventTopic;
  /** 已落成当前语言的主题名 */
  topic_label: string;
  status: EventStatus;
  /** 已落成当前语言的阶段名 */
  status_label: string;
  /**
   * 已落成当前语言的势头角标（「↑ 42%」/「3 个来源正在跟进」）。
   * 空串 = 没有可主张的变化，渲染侧直接跳过。
   */
  momentum_label: string;
  /** 势头是不是「在涨」——只决定角标配色，不参与文案 */
  momentum_rising: boolean;
  /**
   * 已落成当前语言的类型与事实 chips（「故障」「47 分钟」「已解决」）。
   * 空数组 = 判不出类型，渲染侧整块跳过——绝大多数普通报道都是这样。
   */
  fact_labels: string[];
  signal_count: number;
  source_names: string[];
  last_activity_at: string;
}

export interface PublicEventTimelineItem {
  occurred_at: string;
  /** 已落成当前语言：code 走模块 locale 表，自由文案走语言表 */
  label: string;
  source_name: string;
  source_kind: EventSourceKind;
  url: string | null;
  /**
   * 状态页那条 incident 的一手更新序列，嵌在这一格里渲染。
   * **不翻译**——阶段词与正文都逐字取自来源，与「事件只显示来源原文」同一条口径。
   */
  incident_updates: EventIncidentUpdate[];
}

export interface PublicEventSource {
  title: string;
  url: string;
  source_name: string;
  source_kind: EventSourceKind;
  published_at: string;
}

/**
 * 「为什么在扩散」的一条事实，文案已落成当前语言。
 *
 * `confidence_label` 单独给一条：**已证实 / 仅讨论必须让读者一眼分清**，
 * 混在正文里会被读成同一种可信度。
 */
export interface PublicTrendingFactor {
  text: string;
  confidence: "confirmed" | "discussion";
  confidence_label: string;
}

/** 相关事件在公开面上只是一条链接：标题 + 站内地址。 */
export interface PublicRelatedEvent {
  href: string;
  title: string;
}

export interface PublicEventDetailView extends PublicEventCard {
  summary: string;
  /** heuristic | llm */
  analyzer: string;
  /**
   * 「这段摘要是谁写的」的整句说明，已落成当前语言。
   * 规则整理与 AI 生成对读者的可信度不同，公开面更不能省略这句。
   */
  provenance_note: string;
  first_seen_at: string;
  timeline: PublicEventTimelineItem[];
  /** 已按 official / news / community 分好组，且组名已落成当前语言 */
  source_groups: { kind: EventSourceKind; label: string; items: PublicEventSource[] }[];
  /** 相关事件（不是同一件事）。空数组 = 没算出来或没配 embedding key，整块不渲染 */
  related: PublicRelatedEvent[];
  /** 「为什么在扩散」。说不清楚时是空数组，整块不渲染 */
  why_trending: PublicTrendingFactor[];
}

/** 实体页的公开视图。文案已落成当前语言，段渲染器直接读。 */
export interface PublicEntityView {
  slug: string;
  href: string;
  /** 这个实体的 RSS 地址 */
  feed_href: string;
  name: string;
  /** 已落成当前语言的类型名（公司 / 产品 / 人物…） */
  kind_label: string;
  /** 该实体关联了多少个事件 */
  event_count: number;
  events: PublicEventCard[];
}

export interface PublicEventFeed {
  rising: PublicEventCard[];
  now: PublicEventCard[];
}

export interface EventsRenderContext {
  feed: PublicEventFeed;
  /** 详情模板页才有；列表页与普通页面上恒为 null */
  event: PublicEventDetailView | null;
  /**
   * 实体模板页才有；其余页面恒为 null。
   * 与 `event` 同理由 path handler 直接带进来——只有它知道当前是哪个实体。
   */
  entity?: PublicEntityView | null;
  index_path: string;
  /**
   * 查询列表页：这一段已经是「全部」，不再按区块 limit 截断，
   * 也不再画「查看全部」（再点只会打开自己）。
   */
  listing?: EventsIndexQuery;
  /**
   * 枢纽上的当前主题（路径 `/events/ai`，没有 source）。段仍按 limit 截断，
   * 「查看全部」要带上这个过滤，不能掉回未过滤的枢纽 `?source=`。
   */
  topic?: EventTopic;
  /** 编辑器「某个主题」下拉用的已落成当前语言的主题名 */
  nav_topics?: readonly { key: EventTopic; label: string }[];
}

export function emptyEventsContext(
  overrides: Partial<EventsRenderContext> = {},
): EventsRenderContext {
  return {
    feed: { rising: [], now: [] },
    event: null,
    index_path: EVENTS_INDEX_PATH,
    ...overrides,
  };
}

export function eventsContextEntry(
  context: EventsRenderContext,
): Record<string, EventsRenderContext> {
  return { [EVENTS_CONTEXT_KEY]: context };
}

/** 渲染器统一走这个读取函数收口断言，别让每个段各写一遍 `as`。 */
export function readEventsContext(ctx: {
  contributed?: SectionRenderContext["contributed"];
}): EventsRenderContext | null {
  const value = ctx.contributed?.[EVENTS_CONTEXT_KEY];
  return value ? (value as EventsRenderContext) : null;
}
