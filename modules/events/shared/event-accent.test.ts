import { describe, expect, it } from "vitest";

import {
  eventPublisherIconUrl,
  topicAccentHue,
  topicAccentStyle,
} from "./event-accent.js";
import { EVENT_TOPICS } from "./events.js";

describe("topicAccentHue", () => {
  /*
   * 同一主题恒为同一条色。上一版按 slug 在区间内抖动，一排细线看起来像没对齐——
   * 抖动是那套「程序化题图」留下的习惯，不是需求。
   */
  it("gives one topic exactly one hue", () => {
    expect(topicAccentHue("tech")).toBe(topicAccentHue("tech"));
    expect(topicAccentHue("ai")).not.toBe(topicAccentHue("tech"));
  });

  it("gives all seven topics distinct hues", () => {
    const hues = EVENT_TOPICS.map(topicAccentHue);
    expect(new Set(hues).size).toBe(EVENT_TOPICS.length);
  });

  /* 缺一条线会让那张卡看起来是坏的，所以脏数据回落而不是不上色。 */
  it("falls back instead of leaving a card uncoloured", () => {
    expect(topicAccentHue("not-a-topic")).toBe(topicAccentHue("tech"));
    expect(topicAccentHue("")).toBe(topicAccentHue("tech"));
  });

  it("stays inside the legal hue range", () => {
    for (const topic of EVENT_TOPICS) {
      expect(topicAccentHue(topic)).toBeGreaterThanOrEqual(0);
      expect(topicAccentHue(topic)).toBeLessThan(360);
    }
  });
});

describe("topicAccentStyle", () => {
  it("emits only the one custom property", () => {
    expect(topicAccentStyle("tech")).toMatch(/^--topic-hue:\d+$/u);
  });

  /* 值会被 escapeHtml 后写进 style 属性，本身不能带任何结构字符。 */
  it("never emits anything that could break out of the attribute", () => {
    const style = topicAccentStyle('"><script>');
    expect(style).not.toContain('"');
    expect(style).not.toContain("<");
  });
});

describe("eventPublisherIconUrl", () => {
  it("uses the source icon when there is exactly one source", () => {
    expect(
      eventPublisherIconUrl({
        source_names: ["Cloudflare Status"],
        source_icon_urls: ["/events/icons/cloudflare.com"],
      }),
    ).toBe("/events/icons/cloudflare.com");
  });

  /* 多来源事件取第一张图是在编一个它没有的主角。 */
  it("draws nothing on a multi-source event", () => {
    expect(
      eventPublisherIconUrl({
        source_names: ["Reuters", "Hacker News"],
        source_icon_urls: ["/events/icons/reuters.com", null],
      }),
    ).toBeNull();
  });

  it("returns null when the single source has no derivable icon", () => {
    expect(
      eventPublisherIconUrl({
        source_names: ["Some Blog"],
        source_icon_urls: [null],
      }),
    ).toBeNull();
  });

  it("returns null when the event has no sources at all", () => {
    expect(
      eventPublisherIconUrl({ source_names: [], source_icon_urls: [] }),
    ).toBeNull();
  });
});
