/**
 * 官网段的按请求数据（走 `SectionRenderContext.contributed["events"]`）。
 *
 * 形状是**已经落成当前语言的视图**，不是领域对象：段渲染器是同步的，也拿不到 i18n，
 * 所以时间线的 `label` 在建上下文时就解析好（SSR 用模块 locale JSON，编辑器预览用
 * i18next），两端各解析一次但用的是同一份文案。
 */

import type { EventSourceKind, EventStatus, EventTopic } from "./events.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const EVENTS_CONTEXT_KEY = "events";

export const EVENTS_INDEX_PATH = "/events";

export function eventPath(slug: string): string {
  return `${EVENTS_INDEX_PATH}/${encodeURIComponent(slug)}`;
}

/**
 * `/events` 与 `/events/:slug` 都由本模块的 path handler 接。
 * 只认一层 slug——再深的路径不是事件，交回给普通页面查找。
 */
export function isEventsPath(path: string): boolean {
  if (path === EVENTS_INDEX_PATH) {
    return true;
  }
  if (!path.startsWith(`${EVENTS_INDEX_PATH}/`)) {
    return false;
  }
  const rest = path.slice(EVENTS_INDEX_PATH.length + 1);
  return rest.length > 0 && !rest.includes("/");
}

export interface PublicEventCard {
  slug: string;
  href: string;
  title: string;
  headline: string;
  topic: EventTopic;
  /** 已落成当前语言的主题名 */
  topic_label: string;
  status: EventStatus;
  /** 已落成当前语言的阶段名 */
  status_label: string;
  velocity_pct: number;
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
}

export interface PublicEventSource {
  title: string;
  url: string;
  source_name: string;
  source_kind: EventSourceKind;
  published_at: string;
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
}

export interface PublicEventFeed {
  rising: PublicEventCard[];
  now: PublicEventCard[];
  today: PublicEventCard[];
  today_total: number;
}

export interface EventsRenderContext {
  feed: PublicEventFeed;
  /** 详情模板页才有；列表页与普通页面上恒为 null */
  event: PublicEventDetailView | null;
  index_path: string;
}

export function emptyEventsContext(
  overrides: Partial<EventsRenderContext> = {},
): EventsRenderContext {
  return {
    feed: { rising: [], now: [], today: [], today_total: 0 },
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
export function readEventsContext(
  ctx: SectionRenderContext,
): EventsRenderContext | null {
  const value = ctx.contributed?.[EVENTS_CONTEXT_KEY];
  return value ? (value as EventsRenderContext) : null;
}
