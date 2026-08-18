/**
 * 页头 / 页脚导航的事件主题源。
 *
 * 主题是产品分类法（`EVENT_TOPICS`），不是租户自建的分类树。以前页头只能手填
 * 一条指向 `/events` 的链接——格子换了名字、加了新格，页头不会跟着动。两个源与
 * shop 的「整店 / 某分类」同构：
 *
 * | source         | children                 | flat（默认）        |
 * | -------------- | ------------------------ | ------------------- |
 * | `events`       | 「事件」一条，下挂 7 格  | 7 个 topic 各占一条 |
 * | `events.topic` | 该 topic 一条            | 同左（叶子）        |
 *
 * 链接是 `/events/ai`（当首页时 `/ai`），不是 `?topic=`：页头高亮靠 currentPath
 * 精确匹配，查询串进不去。格子是产品枚举，站点可关掉其中几格（`nav_topics`）；
 * 页头只挂本源时，context provider 不得为了导航去拉 feed。
 */

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENT_TOPICS, isEventTopic, type EventTopic } from "./events.js";
import {
  EVENTS_INDEX_PATH,
  eventsIndexHref,
  readEventsContext,
  type EventsRenderContext,
} from "./events-section-context.js";

import {
  makeNavLink,
  registerNavSource,
  resolveNavLabel,
  type NavCategoryOption,
  type NavSourceDefinition,
  type ResolvedNavItem,
  type SiteNavContext,
  type SiteNavItem,
} from "@rewindom/builtin/marketing/shared/site-nav.js";

export const EVENTS_NAV_SOURCE = "events";
export const EVENTS_TOPIC_NAV_SOURCE = "events.topic";

export const EVENTS_NAV_SOURCES = [
  EVENTS_NAV_SOURCE,
  EVENTS_TOPIC_NAV_SOURCE,
] as const;

function messagesFor(locale: string): typeof en {
  return locale.startsWith("zh") ? zhCN : en;
}

/** SSR 与公开页没有 i18next，源自己从 locale JSON 读兜底文案。 */
export function eventsNavFallbackLabel(locale: string): string {
  return messagesFor(locale).nav.events;
}

export function eventsTopicNavLabel(topic: EventTopic, locale: string): string {
  return messagesFor(locale).topic[topic];
}

function topicLabel(topic: EventTopic, ctx: SiteNavContext): string {
  const fromContext = readEventsContext(ctx)?.nav_topics?.find(
    (entry) => entry.key === topic,
  )?.label;
  return fromContext?.trim() || eventsTopicNavLabel(topic, ctx.locale);
}

function enabledTopicsFromContext(ctx: SiteNavContext): readonly EventTopic[] {
  const fromContext = readEventsContext(ctx)?.nav_topics;
  if (fromContext && fromContext.length > 0) {
    return fromContext.map((entry) => entry.key);
  }
  // 上下文没带 nav_topics 时退回七格（失效方向：宁可多显示）。
  // 事件模板页走 path handler，不会跑 CMS 那条 provider，必须自己用
  // withEventsNavTopics 补上，否则关掉的格子还会挂在页头。
  return EVENT_TOPICS;
}

/** 模板页渲染前补上启用格子；已经带了就不动。 */
export function withEventsNavTopics(
  events: EventsRenderContext,
  locale: string,
  enabled: readonly EventTopic[],
): EventsRenderContext {
  if (events.nav_topics && events.nav_topics.length > 0) {
    return events;
  }
  return {
    ...events,
    nav_topics: eventsNavTopicOptions(locale, enabled),
  };
}

function topicItems(
  ctx: SiteNavContext,
  keyPrefix: string,
): ResolvedNavItem[] {
  const indexPath = navIndexPath(ctx);
  return enabledTopicsFromContext(ctx).map((topic) =>
    makeNavLink(
      `${keyPrefix}:${topic}`,
      topicLabel(topic, ctx),
      eventsIndexHref({ topic }, indexPath),
      ctx,
    ),
  );
}

function navIndexPath(ctx: SiteNavContext): string {
  return readEventsContext(ctx)?.index_path ?? EVENTS_INDEX_PATH;
}

function expandEventsTopics(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  const items = topicItems(ctx, item.id);
  if (item.expand === "flat") {
    return items;
  }
  const indexPath = navIndexPath(ctx);
  const label =
    resolveNavLabel(item.label, ctx, indexPath) ||
    eventsNavFallbackLabel(ctx.locale);
  return [makeNavLink(item.id, label, indexPath, ctx, items)];
}

function expandEventsTopic(
  item: SiteNavItem,
  ctx: SiteNavContext,
): ResolvedNavItem[] {
  if (!isEventTopic(item.category)) return [];
  if (!enabledTopicsFromContext(ctx).includes(item.category)) return [];
  const label =
    resolveNavLabel(item.label, ctx) || topicLabel(item.category, ctx);
  return [
    makeNavLink(
      item.id,
      label,
      eventsIndexHref({ topic: item.category }, navIndexPath(ctx)),
      ctx,
    ),
  ];
}

function eventTopicOptions(
  contributed: Readonly<Record<string, unknown>> | undefined,
): NavCategoryOption[] {
  const fromContext = readEventsContext({ contributed })?.nav_topics;
  if (fromContext && fromContext.length > 0) {
    return [...fromContext];
  }
  return EVENT_TOPICS.map((topic) => ({
    key: topic,
    label: eventsTopicNavLabel(topic, "en"),
  }));
}

export const EVENTS_NAV_SOURCE_DEF: NavSourceDefinition = {
  source: EVENTS_NAV_SOURCE,
  label: "events:nav.source.topics",
  defaultLabel: "events:nav.source.topicsDefault",
  entitlement: EVENTS_ENTITLEMENT.key,
  defaultExpand: "flat",
  expand: expandEventsTopics,
};

export const EVENTS_TOPIC_NAV_SOURCE_DEF: NavSourceDefinition = {
  source: EVENTS_TOPIC_NAV_SOURCE,
  label: "events:nav.source.topic",
  defaultLabel: "events:nav.source.topicDefault",
  entitlement: EVENTS_ENTITLEMENT.key,
  usesCategory: true,
  categoryOptions: eventTopicOptions,
  defaultExpand: "children",
  expand: expandEventsTopic,
};

export function eventsNavTopicOptions(
  locale: string,
  enabled: readonly EventTopic[] = EVENT_TOPICS,
): Array<{ key: EventTopic; label: string }> {
  return enabled.map((topic) => ({
    key: topic,
    label: eventsTopicNavLabel(topic, locale),
  }));
}

/** server onBoot 与 client manifest 各调一次（幂等）。 */
export function registerEventsNavSources(): void {
  registerNavSource(EVENTS_NAV_SOURCE_DEF);
  registerNavSource(EVENTS_TOPIC_NAV_SOURCE_DEF);
}
