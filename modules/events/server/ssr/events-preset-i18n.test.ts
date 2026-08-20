/**
 * marketing 建页走 `createStarterTranslator`，只认 `registerLocaleCatalog`。
 * 本文件的副作用必须把 events ns 挂上去，否则 `events:site.topic.title` 会原样
 * 写进页面设置。
 */

import { describe, expect, it } from "vitest";

import { createStarterTranslator } from "@rewindom/builtin/marketing/server/starter-i18n.js";

import "./events-preset-i18n.js";

describe("events preset catalog", () => {
  it("marketing 快照能解开专题页标题 key", () => {
    const zh = createStarterTranslator("zh-CN");
    expect(zh("events:site.topic.title")).toBe("{topic}");
    expect(zh("events:site.detail.title")).toBe("{event}");
    expect(zh("events:site.entity.title")).toBe("{entity}");
    expect(zh("events:site.hero.entityHeadline")).toBe(
      "与 {entity} 相关的全部事件",
    );
    expect(zh("events:site.topic.subtitle")).toBe(
      "跨来源追踪 {topic} 正在发生的事",
    );
    const en = createStarterTranslator("en");
    expect(en("events:site.topic.title")).toBe("{topic}");
  });
});
