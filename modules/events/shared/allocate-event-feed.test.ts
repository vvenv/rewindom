import { describe, expect, it } from "vitest";

import {
  allocateEventFeed,
  cardsForEventFeedSection,
  collectEventFeedSlots,
  eventFeedSlotFromSection,
} from "./allocate-event-feed.js";

import type { EventFeedSectionNode } from "./allocate-event-feed.js";
import type { EventTopic } from "./events.js";

function card(slug: string, topic: EventTopic = "ai"): { slug: string; topic: EventTopic } {
  return { slug, topic };
}

function section(
  id: string,
  type: string,
  extra: Record<string, unknown> = {},
): EventFeedSectionNode {
  return {
    id,
    type,
    settings: { limit: 4, ...extra },
    blocks: [],
  };
}

describe("collectEventFeedSlots", () => {
  it("按文档序收集，并下钻 group 列", () => {
    const tree: EventFeedSectionNode[] = [
      {
        id: "group",
        type: "group",
        settings: {},
        blocks: [
          {
            sections: [section("rising", "events.rising", { limit: 3 })],
          },
        ],
      },
      section("now", "events.now", { limit: 5 }),
    ];
    expect(collectEventFeedSlots(tree).map((slot) => slot.id)).toEqual([
      "rising",
      "now",
    ]);
  });
});

describe("allocateEventFeed", () => {
  const hot = card("hot");
  const pools = {
    rising: [hot, card("r2"), card("r3")],
    now: [hot, card("n2"), card("n3"), card("n4")],
  };

  it("先来先得：后面的段让开已经出现过的 slug", () => {
    const assigned = allocateEventFeed(
      [
        eventFeedSlotFromSection(section("rising", "events.rising", { limit: 2 })),
        eventFeedSlotFromSection(section("now", "events.now", { limit: 3 })),
      ],
      pools,
    );
    expect(assigned.get("rising")?.map((item) => item.slug)).toEqual([
      "hot",
      "r2",
    ]);
    expect(assigned.get("now")?.map((item) => item.slug)).toEqual(["n2", "n3", "n4"]);
  });

  it("单独一段拿到完整列表——去重不能反过来让内容变少", () => {
    const assigned = allocateEventFeed(
      [eventFeedSlotFromSection(section("now", "events.now", { limit: 5 }))],
      pools,
    );
    expect(assigned.get("now")?.map((item) => item.slug)).toEqual([
      "hot",
      "n2",
      "n3",
      "n4",
    ]);
  });

  it("池子不够大时，后面的段只能拿到剩下的", () => {
    const nowPool = [
      card("a"),
      card("b"),
      card("c"),
      card("d"),
      card("e"),
      card("f"),
      card("g"),
      card("h"),
      card("i"),
      card("j"),
    ];
    const assigned = allocateEventFeed(
      [
        eventFeedSlotFromSection(section("rising", "events.rising", { limit: 8 })),
        eventFeedSlotFromSection(section("now", "events.now", { limit: 4 })),
      ],
      {
        rising: nowPool.slice(0, 8),
        now: nowPool,
      },
    );
    expect(assigned.get("rising")).toHaveLength(8);
    expect(assigned.get("now")?.map((item) => item.slug)).toEqual(["i", "j"]);
  });

  it("Now 池按前面可能占掉的条数加量后，Now 仍能凑满 limit", () => {
    const nowPool = Array.from({ length: 20 }, (_, index) =>
      card(`n${index + 1}`),
    );
    const assigned = allocateEventFeed(
      [
        eventFeedSlotFromSection(section("rising", "events.rising", { limit: 8 })),
        eventFeedSlotFromSection(section("now", "events.now", { limit: 8 })),
      ],
      {
        rising: nowPool.slice(0, 8),
        now: nowPool,
      },
    );
    expect(assigned.get("now")).toHaveLength(8);
    const risingSlugs = new Set(assigned.get("rising")?.map((item) => item.slug));
    expect(assigned.get("now")?.some((item) => risingSlugs.has(item.slug))).toBe(
      false,
    );
  });
});

describe("cardsForEventFeedSection", () => {
  it("没有页面树时按「本段单独摆」分配", () => {
    const now = section("now", "events.now", { limit: 2 });
    const cards = cardsForEventFeedSection(
      now,
      undefined,
      {
        rising: [card("r")],
        now: [card("a"), card("b"), card("c")],
      },
    );
    expect(cards.map((item) => item.slug)).toEqual(["a", "b"]);
  });

  it("用当前段的 live limit 覆盖树上的旧值——滑杆立刻生效", () => {
    const rising = section("rising", "events.rising", { limit: 1 });
    const now = section("now", "events.now", { limit: 2 });
    const liveRising = section("rising", "events.rising", { limit: 2 });
    const cards = cardsForEventFeedSection(
      liveRising,
      [rising, now],
      {
        rising: [card("a"), card("b"), card("c")],
        now: [card("a"), card("b"), card("c"), card("d")],
      },
    );
    expect(cards.map((item) => item.slug)).toEqual(["a", "b"]);
  });
});
