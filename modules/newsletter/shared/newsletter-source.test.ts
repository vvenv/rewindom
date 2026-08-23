import { afterEach, describe, expect, it } from "vitest";

import {
  findNewsletterSource,
  listNewsletterSources,
  registerNewsletterSource,
  resetNewsletterSources,
} from "./newsletter-source.js";

import type { NewsletterSource } from "./newsletter-source.js";

function source(id: string, prefix: string): NewsletterSource {
  return {
    id,
    listLists: async () => [{ list_key: `${prefix}:all`, label: `${id} all` }],
    ownsList: (key) => key.startsWith(`${prefix}:`),
    listItemsSince: async () => ({ items: [], next_cursor: null }),
  };
}

afterEach(() => {
  resetNewsletterSources();
});

describe("内容源注册表", () => {
  it("多个源并存，后注册的不顶掉先注册的", () => {
    // 内容天然来自多个域——这正是它是列表而不是单值的原因
    registerNewsletterSource(source("events", "events"));
    registerNewsletterSource(source("shop", "shop"));
    expect(listNewsletterSources().map((s) => s.id)).toEqual([
      "events",
      "shop",
    ]);
  });

  it("同一个 id 重复注册只留一份", () => {
    // onBoot 在测试里可能跑多次，重复登记不该让摘要发两遍
    registerNewsletterSource(source("events", "events"));
    registerNewsletterSource(source("events", "events-again"));
    expect(listNewsletterSources()).toHaveLength(1);
  });

  it("按 key 找到认领它的源", () => {
    registerNewsletterSource(source("events", "events"));
    registerNewsletterSource(source("shop", "shop"));
    expect(findNewsletterSource("events:topic:ai")?.id).toBe("events");
    expect(findNewsletterSource("shop:new-arrivals")?.id).toBe("shop");
  });

  it("没人认领时返回 null——列表被下线会走到这里", () => {
    registerNewsletterSource(source("events", "events"));
    expect(findNewsletterSource("gone:whatever")).toBeNull();
  });

  it("空注册表不炸", () => {
    expect(listNewsletterSources()).toEqual([]);
    expect(findNewsletterSource("anything")).toBeNull();
  });
});
