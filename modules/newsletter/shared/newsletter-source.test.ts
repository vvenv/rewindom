import { afterEach, describe, expect, it } from "vitest";

import {
  buildListOptions,
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
    describeList: async ({ list_key }) => `名字：${list_key}`,
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

describe("buildListOptions", () => {
  const eventsLists = [
    {
      source_id: "events",
      source_label: "事件雷达",
      list_key: "events:all",
      label: "全部事件",
    },
    {
      source_id: "events",
      source_label: "事件雷达",
      list_key: "events:topic:ai",
      label: "AI",
    },
  ];

  it("单源时标签保持干净——给每一项盖一句来源是一行废话", () => {
    expect(buildListOptions(eventsLists)).toEqual([
      { value: "events:all", label: "全部事件" },
      { value: "events:topic:ai", label: "AI" },
    ]);
  });

  it("多源时把来源写进标签", () => {
    /*
     * list_key 前缀（events:topic:business）不显示在界面上，两个源各有一个叫
     * 「商业」的列表时下拉里完全无法区分——租户选错了，读者就收到没订的东西。
     */
    const options = buildListOptions([
      ...eventsLists,
      {
        source_id: "shop",
        source_label: "商店",
        list_key: "shop:new",
        label: "新品",
      },
    ]);
    expect(options.map((o) => o.label)).toEqual([
      "事件雷达 · 全部事件",
      "事件雷达 · AI",
      "商店 · 新品",
    ]);
  });

  it("同名列表在多源下能区分开", () => {
    const options = buildListOptions([
      {
        source_id: "events",
        source_label: "事件雷达",
        list_key: "events:topic:business",
        label: "商业",
      },
      {
        source_id: "news",
        source_label: "新闻",
        list_key: "news:business",
        label: "商业",
      },
    ]);
    expect(new Set(options.map((o) => o.label)).size).toBe(2);
  });

  it("源没报名字时退回 source_id，不至于变成裸的「· 商业」", () => {
    const options = buildListOptions([
      { source_id: "events", list_key: "events:topic:ai", label: "AI" },
      { source_id: "shop", list_key: "shop:new", label: "新品" },
    ]);
    expect(options.map((o) => o.label)).toEqual(["events · AI", "shop · 新品"]);
  });

  it("空列表不炸", () => {
    expect(buildListOptions([])).toEqual([]);
  });
});
