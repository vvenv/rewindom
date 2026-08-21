/**
 * 公开访客 URL。
 *
 * 集合按类型占段，首页永远是 CMS 的 `/`。可选 `EVENTS_MODULE_PREFIX` 套在
 * 集合路径外面（默认空）：`radar` → `/radar/topics/ai`。
 *
 *   /                         站点首页（CMS；雷达只贡献版式）
 *   /topics/:slug              专题
 *   /events/:slug              事件详情
 *   /entities                  实体枢纽
 *   /entities/:slug            实体详情
 *   /feed.xml                  全站 RSS
 *   /topics/:slug/feed.xml     专题 RSS
 *   /entities/:slug/feed.xml   实体 RSS
 *   /events/:slug/og.png       事件卡片图
 *   /events/icons/:host        来源 favicon（同源代理）
 *
 * 没有专题目录、没有 `/events` 枢纽。只认上表，旧地址不接、不转。
 */

import {
  isEventSourceKind,
  isEventTopic,
  parseEventFeedTab,
  type EventFeedTab,
  type EventSourceKind,
  type EventTopic,
} from "./events.js";
import { isIconHost, sourceIconUrlFromHost } from "./source-icon.js";

/**
 * 模块级前缀，不含斜杠。空串 = 集合路径落在站点根。
 * 这是代码常量，不是租户可填的路径。
 */
export const EVENTS_MODULE_PREFIX = "";

export const EVENTS_TOPICS_SEGMENT = "topics";
export const EVENTS_EVENTS_SEGMENT = "events";
export const EVENTS_ENTITY_SEGMENT = "entities";
export const EVENTS_FEED_SEGMENT = "feed.xml";
export const EVENTS_OG_IMAGE_SEGMENT = "og.png";
export const EVENTS_ICONS_SEGMENT = "icons";

/** 与 `registerHomeLayout` 的 key 一致。 */
export const EVENTS_HOME_LAYOUT_KEY = "events.home";

export function eventsModuleBase(
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

export function withEventsPrefix(
  path: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  const base = eventsModuleBase(prefix);
  const rest = path.startsWith("/") ? path : `/${path}`;
  if (!base) return rest;
  if (rest === "/") return base;
  return `${base}${rest}`;
}

function joinPublic(left: string, segment: string): string {
  if (left === "/") return `/${segment}`;
  return `${left}/${segment}`;
}

/** 无专题过滤时的枢纽：空 prefix 就是站点根。 */
export function eventsHubPath(prefix: string = EVENTS_MODULE_PREFIX): string {
  return eventsModuleBase(prefix) || "/";
}

export function topicPath(
  topic: EventTopic,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return withEventsPrefix(`/${EVENTS_TOPICS_SEGMENT}/${topic}`, prefix);
}

export function eventPath(
  slug: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return withEventsPrefix(
    `/${EVENTS_EVENTS_SEGMENT}/${encodeURIComponent(slug)}`,
    prefix,
  );
}

export function entityIndexPath(
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return withEventsPrefix(`/${EVENTS_ENTITY_SEGMENT}`, prefix);
}

export function entityPath(
  slug: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return withEventsPrefix(
    `/${EVENTS_ENTITY_SEGMENT}/${encodeURIComponent(slug)}`,
    prefix,
  );
}

export function eventsFeedPath(
  topic?: EventTopic,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return topic
    ? joinPublic(topicPath(topic, prefix), EVENTS_FEED_SEGMENT)
    : withEventsPrefix(`/${EVENTS_FEED_SEGMENT}`, prefix);
}

export function entityFeedPath(
  slug: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return joinPublic(entityPath(slug, prefix), EVENTS_FEED_SEGMENT);
}

export function eventOgImagePath(
  slug: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return joinPublic(eventPath(slug, prefix), EVENTS_OG_IMAGE_SEGMENT);
}

export function sourceIconPath(
  host: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  return withEventsPrefix(sourceIconUrlFromHost(host), prefix);
}

/** 当前页 RSS。有主题时订那一格，否则全站。看见的就是 `{feed}`。 */
export const EVENTS_FEED_HREF_TEMPLATE = "{feed}";

export function eventsReservedSlugs(
  prefix: string = EVENTS_MODULE_PREFIX,
): readonly string[] {
  const base = eventsModuleBase(prefix);
  if (base) return [base.slice(1)];
  return [
    EVENTS_TOPICS_SEGMENT,
    EVENTS_EVENTS_SEGMENT,
    EVENTS_ENTITY_SEGMENT,
  ];
}

export interface EventsHomeMount {
  homeLayoutKey?: string;
}

/** `/` 上的 `?source=` 列表只在雷达当首页时接管。 */
export function eventsHomeIsRadar(input: EventsHomeMount = {}): boolean {
  return input.homeLayoutKey === EVENTS_HOME_LAYOUT_KEY;
}

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

export function isEventsIndexListing(
  query: EventsIndexQuery,
): query is EventsIndexQuery & { source: EventFeedTab } {
  return query.source !== undefined;
}

/**
 * 列表地址。topic 走路径段（页头才能高亮）；`source` 仍是查询。
 * 无专题时落在枢纽（空 prefix = `/`）。
 */
export function eventsIndexHref(
  query: EventsIndexQuery = {},
  prefix: string = EVENTS_MODULE_PREFIX,
): string {
  const base = query.topic
    ? topicPath(query.topic, prefix)
    : eventsHubPath(prefix);
  const params = new URLSearchParams();
  if (query.source) params.set("source", query.source);
  const search = params.toString();
  return search ? `${base}?${search}` : base;
}

export type EventsPublicRoute =
  | { type: "topic"; topic: EventTopic }
  | { type: "event"; slug: string }
  | { type: "entity_index" }
  | { type: "entity"; slug: string }
  | { type: "feed"; topic?: EventTopic }
  | { type: "entity_feed"; slug: string }
  | { type: "og_image"; slug: string }
  | { type: "source_icon"; host: string };

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function segmentsOf(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function stripPrefix(path: string, prefix: string): string | null {
  const base = eventsModuleBase(prefix);
  if (!base) return path;
  if (path === base) return "/";
  if (path.startsWith(`${base}/`)) return path.slice(base.length);
  return null;
}

function hasResourceSuffix(path: string): boolean {
  return (
    path.endsWith(`/${EVENTS_FEED_SEGMENT}`) ||
    path.endsWith(`/${EVENTS_OG_IMAGE_SEGMENT}`)
  );
}

function stripTrailing(path: string, segment: string): string | null {
  const suffix = `/${segment}`;
  if (!path.endsWith(suffix)) return null;
  return path.slice(0, -suffix.length) || "/";
}

export function parseEventsPublicPath(
  path: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): EventsPublicRoute | null {
  const stripped = stripPrefix(path, prefix);
  if (stripped === null) return null;
  if (hasResourceSuffix(stripped)) {
    return parseResource(stripped);
  }
  const parts = segmentsOf(stripped);
  if (parts.length === 1 && parts[0] === EVENTS_ENTITY_SEGMENT) {
    return { type: "entity_index" };
  }
  if (parts.length === 2 && parts[0] === EVENTS_ENTITY_SEGMENT) {
    return { type: "entity", slug: decodeSegment(parts[1]!) };
  }
  if (parts.length === 2 && parts[0] === EVENTS_TOPICS_SEGMENT) {
    const topic = decodeSegment(parts[1]!);
    return isEventTopic(topic) ? { type: "topic", topic } : null;
  }
  if (
    parts.length === 3 &&
    parts[0] === EVENTS_EVENTS_SEGMENT &&
    parts[1] === EVENTS_ICONS_SEGMENT
  ) {
    const host = decodeSegment(parts[2]!).toLowerCase();
    return isIconHost(host) ? { type: "source_icon", host } : null;
  }
  if (parts.length === 2 && parts[0] === EVENTS_EVENTS_SEGMENT) {
    return { type: "event", slug: decodeSegment(parts[1]!) };
  }
  return null;
}

function parseResource(path: string): EventsPublicRoute | null {
  const feedBase = stripTrailing(path, EVENTS_FEED_SEGMENT);
  if (feedBase !== null) {
    if (feedBase === "/") return { type: "feed" };
    const parts = segmentsOf(feedBase);
    if (parts.length === 2 && parts[0] === EVENTS_TOPICS_SEGMENT) {
      const topic = decodeSegment(parts[1]!);
      return isEventTopic(topic) ? { type: "feed", topic } : null;
    }
    if (parts.length === 2 && parts[0] === EVENTS_ENTITY_SEGMENT) {
      return { type: "entity_feed", slug: decodeSegment(parts[1]!) };
    }
    return null;
  }
  const ogBase = stripTrailing(path, EVENTS_OG_IMAGE_SEGMENT);
  if (ogBase === null) return null;
  const parts = segmentsOf(ogBase);
  if (parts.length === 2 && parts[0] === EVENTS_EVENTS_SEGMENT) {
    return { type: "og_image", slug: decodeSegment(parts[1]!) };
  }
  return null;
}

export function isEventsPath(
  path: string,
  prefix: string = EVENTS_MODULE_PREFIX,
): boolean {
  return parseEventsPublicPath(path, prefix) !== null;
}

/**
 * 版式挂在站点根时，`/` 本身仍由首页 CMS 渲染；带 `source` 的查询
 * 才交给事件 handler（列表页）。主题落地是 `/topics/:slug`，不是查询串。
 */
export function isEventsRootQueryTakeover(
  path: string,
  query: Record<string, string>,
  mount: EventsHomeMount = {},
  prefix: string = EVENTS_MODULE_PREFIX,
): boolean {
  if (path !== eventsHubPath(prefix)) return false;
  const parsed = parseEventsIndexQuery(query);
  if (parsed.source === undefined) return false;
  if (eventsHubPath(prefix) !== "/") return true;
  return eventsHomeIsRadar(mount);
}
