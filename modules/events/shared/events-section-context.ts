/**
 * 官网段的按请求数据（走 `SectionRenderContext.contributed["events"]`）。
 *
 * 形状是**已经落成当前语言的视图**，不是领域对象：段渲染器是同步的，也拿不到 i18n，
 * 所以时间线的 `label` 在建上下文时就解析好（SSR 用模块 locale JSON，编辑器预览用
 * i18next），两端各解析一次但用的是同一份文案。
 */

import { isReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";
import { SITE_INTERPOLATION_KEY } from "@rewindom/builtin/marketing/shared/site-interpolation.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

import {
  isEventSourceKind,
  isEventTopic,
  parseEventFeedTab,
  type EventEntityKind,
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
 * 默认走 `/events/entities/:slug`。事件枢纽当首页时收到 `/entities/:slug`：
 * 事件 slug 永远是一段，实体路径恒为两段且首段是 `entities`，两者不会撞。
 *
 * **为什么是复数**：这一段同时是实体枢纽（`/events/entities` 列出全部实体）。
 * 本模块的规矩就是「复数集合段 + 条目挂在它下面」——`/events` 是枢纽、
 * `/events/:slug` 是一条。用单数当集合名，枢纽那张页就读不通了。
 */
export const EVENTS_ENTITY_SEGMENT = "entities";

export function entityPath(
  slug: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(
    indexPath,
    `/${EVENTS_ENTITY_SEGMENT}/${encodeURIComponent(slug)}`,
  );
}

/**
 * 实体枢纽地址：`/events/entities`（枢纽当首页时 `/entities`）。
 *
 * 与实体详情共用前缀而不是另开一段：同一个域下只有一处入口，
 * sitemap、面包屑与 path handler 都少一条分支。
 */
export function entityIndexPath(
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(indexPath, `/${EVENTS_ENTITY_SEGMENT}`);
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
 *
 * 主题是**路径段**（`/events/ai/feed.xml`），与主题枢纽同形。曾经是
 * `?topic=ai`，而同一个文件里 `topicPath` 早就写明「topic 必须是路径段」——
 * 同一个域里主题一会儿是段一会儿是参数，读者与实现都要多记一条。
 */
export const EVENTS_FEED_SEGMENT = "feed.xml";

/**
 * 存进 setting 的当前主题 RSS。`{topic_slug}` 在渲染期换成格子 slug，
 * 空段收掉之后站点首页是 `/events/feed.xml`。看得见、改得动，不要在渲染器里暗改。
 */
export const EVENTS_FEED_HREF_TEMPLATE = `${EVENTS_INDEX_PATH}/{topic_slug}/${EVENTS_FEED_SEGMENT}`;

export function eventsFeedPath(
  topic?: EventTopic,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  const base = topic ? topicPath(topic, indexPath) : indexPath;
  return joinIndex(base, `/${EVENTS_FEED_SEGMENT}`);
}

/**
 * 当前页该订哪个 feed。页头 chrome 与正文订阅段共用。首屏订阅是普通次按钮，
 * 地址写在 setting 里（默认 `/events/{topic_slug}/feed.xml`），不要再走这里暗改。
 */
export function eventsSubscribeHref(input: {
  contributed?: SectionRenderContext["contributed"];
}): string {
  const context = readEventsContext(input);
  return context?.entity
    ? context.entity.feed_href
    : eventsFeedPath(
        context?.listing?.topic ?? context?.topic,
        context?.index_path ?? EVENTS_INDEX_PATH,
      );
}

export const EVENTS_OG_IMAGE_SEGMENT = "og.png";

/**
 * 事件的社交卡片图地址。
 *
 * 与详情页同前缀：枢纽当首页时是 `/:slug/og.png`。整个模块只有一条
 * 「公开地址跟着挂载走」的规矩，不要为「它不是给人看的页面」开一条例外——
 * 例外要记，而记不住的那次就是前缀漏出来的那次。旧地址仍由前缀 handler
 * 接住并 301，已经被抓过的社交卡片不会断。
 */
export function eventOgImagePath(
  slug: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(
    eventPath(slug, indexPath),
    `/${EVENTS_OG_IMAGE_SEGMENT}`,
  );
}

export function entityFeedPath(
  slug: string,
  indexPath: string = EVENTS_INDEX_PATH,
): string {
  return joinIndex(
    entityPath(slug, indexPath),
    `/${EVENTS_FEED_SEGMENT}`,
  );
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
  | { type: "entity_index" }
  | { type: "entity"; slug: string }
  /** 全站 / 某主题的 RSS */
  | { type: "feed"; topic?: EventTopic }
  /** 某个实体的 RSS */
  | { type: "entity_feed"; slug: string }
  /** 某条事件的社交卡片图 */
  | { type: "og_image"; slug: string };

/** 末段是不是 `feed.xml` / `og.png` 这类资源名（而不是一段 slug）。 */
function hasResourceSuffix(path: string): boolean {
  return (
    path.endsWith(`/${EVENTS_FEED_SEGMENT}`) ||
    path.endsWith(`/${EVENTS_OG_IMAGE_SEGMENT}`)
  );
}

/** 剥掉末段；不是这个末段则 null。剥空（`/feed.xml`）时基地址是站点根。 */
function stripTrailingSegment(path: string, segment: string): string | null {
  const suffix = `/${segment}`;
  if (!path.endsWith(suffix)) return null;
  return path.slice(0, -suffix.length) || "/";
}

/**
 * `<基地址>/feed.xml`。只有**三种**基地址有 feed：枢纽、主题格、实体页。
 *
 * 单条事件没有 feed——`/:slug/feed.xml` 一律 null → 404。给不存在的东西
 * 发一份空 feed，订阅者要等到第一次期待落空才知道自己订了个寂寞。
 */
function parseEventsFeedPath(
  path: string,
  indexPath: string,
): EventsPublicRoute | null {
  const base = stripTrailingSegment(path, EVENTS_FEED_SEGMENT);
  if (base === null) return null;
  if (base === indexPath) return { type: "feed" };
  const entitySlug = entitySlugFromPath(base, indexPath);
  if (entitySlug !== null) return { type: "entity_feed", slug: entitySlug };
  const topic = topicFromPath(base, indexPath);
  if (topic !== null) return { type: "feed", topic };
  return null;
}

/** `<详情页>/og.png`。只有事件详情有卡片图，主题格与实体页没有。 */
function parseEventsOgImagePath(
  path: string,
  indexPath: string,
): EventsPublicRoute | null {
  const base = stripTrailingSegment(path, EVENTS_OG_IMAGE_SEGMENT);
  if (base === null) return null;
  const slug = eventSlugFromPath(base, indexPath);
  return slug === null ? null : { type: "og_image", slug };
}

export function parseEventsPublicPath(
  path: string,
  indexPath: string = EVENTS_INDEX_PATH,
): EventsPublicRoute | null {
  if (path === indexPath) return { type: "index" };
  /*
   * 末段先认，而且**认不出也不许往下掉**：`/events/entities/feed.xml` 会被
   * 后面的实体解析读成 slug 为 `feed.xml` 的实体，`/events/feed.xml` 会被读成
   * 同名的事件详情——两种都是静默 404，查起来只看得到「这条事件不存在」。
   */
  if (hasResourceSuffix(path)) {
    return (
      parseEventsFeedPath(path, indexPath) ??
      parseEventsOgImagePath(path, indexPath)
    );
  }
  /*
   * 实体枢纽要在单段解析**之前**认：枢纽挂在根上时 `/entities` 只有一段，
   * 不先拦下来就会被当成一个叫 entities 的事件 slug，然后 404。
   */
  if (path === entityIndexPath(indexPath)) return { type: "entity_index" };
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
 * 再在挂到根上时认 `/:topic`、`/:slug` 与 `/entities/:slug`。
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
 * `/events`、`/events/:topic`、`/events/:slug`、`/events/entities/:slug`，
 * 以及三条非 HTML 地址：`feed.xml`（枢纽 / 主题 / 实体）与详情的 `og.png`。
 *
 * 这是**挂载前缀**上的匹配，与是否把枢纽设为首页无关——旧地址始终由这条
 * handler 接住，再 301 到根上。根上的 `/:topic` / `/:slug` 走 fallback，见
 * `isEventsRootFallbackPath`。
 */
export function isEventsPath(path: string): boolean {
  return parseEventsPublicPath(path, EVENTS_INDEX_PATH) !== null;
}

/**
 * 枢纽当首页时，CMS 未命中后认领的路径：`/:topic`、`/:slug`、`/entities/:slug`，
 * 以及根上的 `feed.xml` / `og.png`。`/` 本身由首页 CMS 渲染（或存量 home_path
 * 改写），不走这里。
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
  /**
   * 归位：已落成当前语言的一串事实（「Cloudflare 近 90 天第 4 次故障」）。
   * 空数组 = 没抽到实体或这是它第一次出现，整块不渲染。
   */
  placement: { text: string; href: string | null }[];
  /** 已按 official / news / community 分好组，且组名已落成当前语言 */
  source_groups: { kind: EventSourceKind; label: string; items: PublicEventSource[] }[];
  /** 相关事件（不是同一件事）。空数组 = 没算出来或没配 embedding key，整块不渲染 */
  related: PublicRelatedEvent[];
  /** 「为什么在扩散」。说不清楚时是空数组，整块不渲染 */
  why_trending: PublicTrendingFactor[];
  /**
   * 这条材料涉及的实体，按提及次数降序。空数组时整块不渲染。
   *
   * 详情页上通往实体页的入口。首页还有 `entity_strip`，枢纽有
   * `entity_index`——三条内链方向缺一，实体页权重就上不去。
   */
  entities: { href: string; name: string }[];
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
  /**
   * 已落成当前语言的累计档案（「近 90 天 12 件事」「故障 3 次」「累计 192 分钟」）。
   * 空数组 = 窗口内不足两件事，整块不渲染。
   */
  profile: string[];
  events: PublicEventCard[];
}

/** 实体枢纽的公开视图：按类型分组，组名与计数文案已落成当前语言。 */
export interface PublicEntityIndexView {
  href: string;
  groups: {
    kind: EventEntityKind;
    /** 已落成当前语言的类型名（公司 / 产品 / 人物…） */
    label: string;
    items: {
      href: string;
      name: string;
      /** 该实体在窗口内关联了多少个事件 */
      event_count: number;
    }[];
  }[];
}

/**
 * 首页 / 任意页上的近期实体条。平铺、按窗口内事件数排序。
 * 与枢纽同一批实体，只是截成 Top N、不分组。
 */
export interface PublicEntityStripView {
  /** 实体枢纽地址，「查看全部」指这里 */
  href: string;
  items: {
    href: string;
    name: string;
    event_count: number;
  }[];
}

/**
 * 首屏那块实时计数里的一行。
 *
 * `value` 已经格式化好（数字带千位分隔，相对时间已落成当前语言），`unit` 是单位词——
 * 拆两个字段是为了让渲染侧能把数字放大而单位不跟着放大，不是为了让它自己拼句子。
 */
export interface PublicHeroStat {
  key: "live" | "merged" | "sources" | "contributors" | "updated";
  /** 已落成当前语言的行名 */
  label: string;
  /** 已格式化的值：`1,284` 或「6 分钟前」 */
  value: string;
  /** 已落成当前语言的单位；相对时间那行为空 */
  unit: string;
  /** 相对时间才有：机器可读的绝对时刻，渲染成 `<time datetime>` */
  datetime?: string;
}

/**
 * 首屏的实时计数面板。
 *
 * `stats` 为空 = 这个站还没有事件（新部署、采集还没跑第一轮），整块不渲染——
 * 首屏挂一串 0 比不挂更糟。
 */
export interface PublicHeroView {
  /** 已落成当前语言的面板抬头（「实时」） */
  live_label: string;
  stats: PublicHeroStat[];
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
  /** 实体枢纽模板页才有；其余页面恒为 null。与 `entity` 同一条理由。 */
  entity_index?: PublicEntityIndexView | null;
  /**
   * 近期实体条。任意页都可有——首页 CMS 与 `/events` 枢纽靠 provider / path
   * handler 填；没摆这段时保持 undefined，渲染器整段跳过。
   */
  entity_strip?: PublicEntityStripView | null;
  /**
   * 首屏实时计数。与 `entity_strip` 同一条口径：任意页可有，没摆首屏段时
   * 保持 undefined，渲染器只画文案列。
   */
  hero?: PublicHeroView | null;
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
  /**
   * 已落成当前语言的当前主题名。CMS 文案里的 `{topic}` 换成它。
   *
   * 与 `topic` 分开放而不是塞进 `hero`：计数为空时 `hero` 是 null，而那时专题页
   * 仍然要用主题名——`/ai` 这一格暂时没有事件，不代表它该改回站点主张。
   */
  topic_label?: string;
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

export function eventsInterpolationValues(
  context: EventsRenderContext,
): Record<string, string> {
  return {
    topic: context.topic_label ?? "",
    topic_slug: context.topic ?? "",
  };
}

export function eventsContextEntry(
  context: EventsRenderContext,
): Record<string, unknown> {
  return {
    [EVENTS_CONTEXT_KEY]: context,
    [SITE_INTERPOLATION_KEY]: eventsInterpolationValues(context),
  };
}

/** 渲染器统一走这个读取函数收口断言，别让每个段各写一遍 `as`。 */
export function readEventsContext(ctx: {
  contributed?: SectionRenderContext["contributed"];
}): EventsRenderContext | null {
  const value = ctx.contributed?.[EVENTS_CONTEXT_KEY];
  return value ? (value as EventsRenderContext) : null;
}
