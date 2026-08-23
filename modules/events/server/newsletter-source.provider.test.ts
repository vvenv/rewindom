import { describe, expect, it } from "vitest";

import {
  EVENTS_LIST_ALL,
  eventsEntityList,
  eventsNewsletterSource,
  eventsTopicList,
  formatCursor,
  parseCursor,
} from "./newsletter-source.provider.js";

describe("ownsList", () => {
  it("认领全站、主题与实体三种 key", () => {
    expect(eventsNewsletterSource.ownsList(EVENTS_LIST_ALL)).toBe(true);
    expect(eventsNewsletterSource.ownsList(eventsTopicList("ai"))).toBe(true);
    expect(eventsNewsletterSource.ownsList(eventsEntityList("openai"))).toBe(
      true,
    );
  });

  it("不认领别的模块的 key", () => {
    // list_key 带模块前缀就是为了这个：多个内容源并存时不会互相抢
    expect(eventsNewsletterSource.ownsList("shop:new-arrivals")).toBe(false);
    expect(eventsNewsletterSource.ownsList("events")).toBe(false);
    expect(eventsNewsletterSource.ownsList("")).toBe(false);
  });
});

describe("游标", () => {
  const at = new Date("2026-08-20T10:00:00.000Z");

  it("往返一致", () => {
    const raw = formatCursor({ first_seen_at: at, id: "evt-1" });
    expect(raw).toBe("2026-08-20T10:00:00.000Z|evt-1");
    expect(parseCursor(raw)).toEqual({ at, id: "evt-1" });
  });

  it("复合而不是纯时间戳", () => {
    /*
     * 同一毫秒可能有多条事件（一轮采集里合并出来的）。纯时间戳做游标时，
     * `> at` 会漏掉同毫秒的其余条目，`>= at` 又会把已发过的重发一遍。
     */
    const a = formatCursor({ first_seen_at: at, id: "evt-1" });
    const b = formatCursor({ first_seen_at: at, id: "evt-2" });
    expect(a).not.toBe(b);
    expect(parseCursor(a)!.id).toBe("evt-1");
    expect(parseCursor(b)!.id).toBe("evt-2");
  });

  it.each([
    null,
    "",
    "garbage",
    "2026-08-20T10:00:00.000Z",
    "|evt-1",
    "not-a-date|evt-1",
  ])("坏游标 %p 退化成 null（当作从头开始，而不是崩掉整轮）", (raw) => {
    expect(parseCursor(raw as string | null)).toBeNull();
  });
});

describe("list key 构造", () => {
  it("主题与实体各有前缀", () => {
    expect(eventsTopicList("ai")).toBe("events:topic:ai");
    expect(eventsEntityList("openai")).toBe("events:entity:openai");
  });
});

describe("动态候选", () => {
  it("认领带 token 的主题 key——聚合层插值前后都得认得", () => {
    // 插值前编辑器里存的是它；插值后变成 events:topic:ai，两种都归 events 管
    expect(eventsNewsletterSource.ownsList("events:topic:{topic_slug}")).toBe(
      true,
    );
    expect(eventsNewsletterSource.ownsList("events:topic:ai")).toBe(true);
  });
});
