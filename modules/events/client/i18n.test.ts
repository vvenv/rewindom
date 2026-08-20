/**
 * 段 schema 的 `events:` 默认值必须在**客户端**也解得开。
 *
 * 编辑器 `createSection` 走的是 `translateRegisteredKeyTable`，只认
 * `registerLocaleCatalog` 登记过的 ns。服务端在 `server/ssr/events-preset-i18n.ts`
 * 登记过一份，客户端漏登记时草稿里会存下 key 原文——租户在编辑器里看到的是
 * `events:site.hero.headline`、设置项还是空的，直到保存后由服务端解析补回来。
 */

import { describe, expect, it } from "vitest";

import { translateRegisteredKeyTable } from "@rewindom/module-sdk";

import "./i18n.js";

import {
  eventsDetailSection,
  eventsEntityHeroSection,
  eventsEntityIndexSection,
  eventsEntitySection,
  eventsEntityStripSection,
  eventsFeedSection,
  eventsHeroSection,
  eventsNowSection,
  eventsRisingSection,
  eventsSubscribeBlock,
  eventsSubscribeSection,
} from "../shared/index.js";

const CONTRIBUTED = [
  eventsHeroSection,
  eventsEntityHeroSection,
  eventsRisingSection,
  eventsNowSection,
  eventsFeedSection,
  eventsDetailSection,
  eventsEntitySection,
  eventsEntityIndexSection,
  eventsEntityStripSection,
  eventsSubscribeSection,
  eventsSubscribeBlock,
];

/** 段 / 块定义里所有 `events:` 前缀的 setting 默认值。 */
function eventsKeyDefaults(): string[] {
  const keys = new Set<string>();
  for (const def of CONTRIBUTED) {
    for (const setting of def.settings) {
      const fallback = (setting as { default?: unknown }).default;
      if (typeof fallback === "string" && fallback.startsWith("events:")) {
        keys.add(fallback);
      }
    }
  }
  return [...keys];
}

describe("events client locale catalog", () => {
  it("登记了 events ns，段默认值才展得成多语言表", () => {
    expect(translateRegisteredKeyTable("events:site.hero.headline")).toEqual({
      "zh-CN": expect.any(String),
      en: expect.any(String),
    });
  });

  it("贡献段里每一条 events: 默认值都解得开", () => {
    const defaults = eventsKeyDefaults();
    // 一条都没扫到多半是段定义换了写法，那本测试就不再守着任何东西
    expect(defaults.length).toBeGreaterThan(0);
    for (const key of defaults) {
      expect(translateRegisteredKeyTable(key), key).toBeDefined();
    }
  });

  it("模板页 titleKey / descriptionKey 也解得开", () => {
    const keys = [
      "events:site.index.title",
      "events:site.index.subtitle",
      "events:site.topic.title",
      "events:site.topic.subtitle",
      "events:site.detail.title",
      "events:site.detail.subtitle",
      "events:site.entity.title",
      "events:site.entity.subtitle",
      "events:site.hero.entityEyebrow",
      "events:site.hero.entityHeadline",
      "events:site.hero.entitySubhead",
      "events:site.entityIndex.title",
      "events:site.entityIndex.subtitle",
    ];
    for (const key of keys) {
      expect(translateRegisteredKeyTable(key), key).toBeDefined();
    }
  });
});
