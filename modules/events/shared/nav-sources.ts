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
 * 展开不查库：格子是编译期枚举。页头只挂本源时，context provider 不得为了导航去拉 feed。
 */

import en from "../client/locales/en.json" with { type: "json" };
import zhCN from "../client/locales/zh-CN.json" with { type: "json" };

import { EVENTS_ENTITLEMENT } from "./entitlements.js";
import { EVENT_TOPICS, isEventTopic, type EventTopic } from "./events.js";
import {
  EVENTS_INDEX_PATH,
  eventsIndexHref,
  readEventsContext,
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

function topicItems(
  ctx: SiteNavContext,
  keyPrefix: string,
): ResolvedNavItem[] {
  const indexPath = navIndexPath(ctx);
  return EVENT_TOPICS.map((topic) =>
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
): Array<{ key: EventTopic; label: string }> {
  return EVENT_TOPICS.map((topic) => ({
    key: topic,
    label: eventsTopicNavLabel(topic, locale),
  }));
}

/** server onBoot 与 client manifest 各调一次（幂等）。 */
export function registerEventsNavSources(): void {
  registerNavSource(EVENTS_NAV_SOURCE_DEF);
  registerNavSource(EVENTS_TOPIC_NAV_SOURCE_DEF);
}
