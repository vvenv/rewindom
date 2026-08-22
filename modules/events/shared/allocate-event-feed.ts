/**
 * 同页 Rising / Now 的分配：取哪几张卡、谁先占、截多少，都在这里。
 *
 * 查询层只给够大的候选池。渲染器按当前页的段树调用本函数。
 */

import {
  EVENTS_FEED_SECTION_TYPES,
  EVENTS_NOW_SECTION_TYPE,
  EVENTS_RISING_SECTION_TYPE,
  eventFeedLimitDefault,
} from "./events-feed-section.js";
import { isEventTopic, parseEventFeedTab } from "./events.js";

import { settingNumber, settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

import type { EventFeedTab, EventTopic } from "./events.js";

/** 页面段树里我们只读 id / type / settings / 列内子段。 */
export interface EventFeedSectionNode {
  id: string;
  type: string;
  settings: Parameters<typeof settingText>[0];
  blocks?: readonly { sections?: readonly EventFeedSectionNode[] }[];
}

export interface EventFeedSlot {
  id: string;
  type: string;
  source: EventFeedTab;
  limit: number;
  topic?: EventTopic;
}

export interface EventFeedPools<T extends { slug: string; topic: EventTopic }> {
  rising: readonly T[];
  now: readonly T[];
}

export function isEventFeedSectionType(type: string): boolean {
  return (EVENTS_FEED_SECTION_TYPES as readonly string[]).includes(type);
}

export function eventFeedSlotFromSection(
  section: EventFeedSectionNode,
): EventFeedSlot {
  const source: EventFeedTab =
    section.type === EVENTS_NOW_SECTION_TYPE
      ? "now"
      : section.type === EVENTS_RISING_SECTION_TYPE
        ? "rising"
        : (parseEventFeedTab(settingText(section.settings, "source")) ?? "rising");
  const topicValue = settingText(section.settings, "topic");
  return {
    id: section.id,
    type: section.type,
    source,
    limit: settingNumber(
      section.settings,
      "limit",
      eventFeedLimitDefault(section.type),
    ),
    topic: isEventTopic(topicValue) ? topicValue : undefined,
  };
}

/**
 * 按页面文档序收集 feed 段（含 group 列）。顺序必须与实际渲染顺序一致，
 * 先来先得才跟访客看到的先后对齐。
 */
export function collectEventFeedSlots(
  sections: readonly EventFeedSectionNode[],
): EventFeedSlot[] {
  const slots: EventFeedSlot[] = [];
  for (const section of sections) {
    if (isEventFeedSectionType(section.type)) {
      slots.push(eventFeedSlotFromSection(section));
    }
    for (const block of section.blocks ?? []) {
      if (block.sections?.length) {
        slots.push(...collectEventFeedSlots(block.sections));
      }
    }
  }
  return slots;
}

function poolFor<T extends { slug: string; topic: EventTopic }>(
  source: EventFeedTab,
  pools: EventFeedPools<T>,
): readonly T[] {
  return source === "now" ? pools.now : pools.rising;
}

/**
 * 按 slots 顺序分配。同一 slug 只给先出现的那段；每段截自己的 limit。
 * slots 里只有一段时，那段拿到自己池子里的完整前 N 条。
 */
export function allocateEventFeed<T extends { slug: string; topic: EventTopic }>(
  slots: readonly EventFeedSlot[],
  pools: EventFeedPools<T>,
  pageTopic?: EventTopic,
): Map<string, T[]> {
  const seen = new Set<string>();
  const assigned = new Map<string, T[]>();

  for (const slot of slots) {
    const topic = slot.topic ?? pageTopic;
    const pool = poolFor(slot.source, pools);
    const picked: T[] = [];
    for (const card of pool) {
      if (picked.length >= slot.limit) break;
      if (topic && card.topic !== topic) continue;
      if (seen.has(card.slug)) continue;
      seen.add(card.slug);
      picked.push(card);
    }
    assigned.set(slot.id, picked);
  }

  return assigned;
}

export function cardsForEventFeedSection<
  T extends { slug: string; topic: EventTopic },
>(
  section: EventFeedSectionNode,
  pageSections: readonly EventFeedSectionNode[] | undefined,
  pools: EventFeedPools<T>,
  pageTopic?: EventTopic,
): T[] {
  const fromPage = pageSections ? collectEventFeedSlots(pageSections) : [];
  const live = eventFeedSlotFromSection(section);
  const slots = fromPage.some((slot) => slot.id === section.id)
    ? fromPage.map((slot) => (slot.id === section.id ? live : slot))
    : [...fromPage, live];
  return allocateEventFeed(slots, pools, pageTopic).get(section.id) ?? [];
}
