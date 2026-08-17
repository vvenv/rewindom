import { describe, expect, it } from "vitest";

import { parseAnalyzerResponse } from "./llm-analyzer.js";

import type { AnalyzerSignal } from "./analyzer.js";

const SIGNALS: AnalyzerSignal[] = [
  {
    signal_id: "s0",
    title: "OpenAI publishes GPT-6 announcement",
    url: "https://openai.com/blog/gpt-6",
    excerpt: "",
    source_name: "OpenAI Blog",
    source_kind: "official",
    published_at: new Date("2025-08-12T10:02:00Z"),
  },
  {
    signal_id: "s1",
    title: "GPT-6 thread",
    url: "https://news.ycombinator.com/item?id=1",
    excerpt: "",
    source_name: "Hacker News",
    source_kind: "community",
    published_at: new Date("2025-08-12T10:17:00Z"),
  },
];

describe("parseAnalyzerResponse", () => {
  it("按 signal_index 映射回真实信号，时间戳只认信号自身的", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "OpenAI ships GPT-6",
        summary: "OpenAI announced GPT-6.",
        timeline: [
          { signal_index: 0, label: "Official announcement" },
          // 模型自作主张给的时间戳必须被忽略
          { signal_index: 1, label: "HN discussion", occurred_at: "1999-01-01T00:00:00Z" },
        ],
      }),
      SIGNALS,
      "en",
    );

    expect(result.title).toBe("OpenAI ships GPT-6");
    expect(result.timeline.map((e) => e.occurred_at.toISOString())).toEqual([
      "2025-08-12T10:02:00.000Z",
      "2025-08-12T10:17:00.000Z",
    ]);
    expect(result.timeline[0].label_text).toBe("Official announcement");
    expect(result.timeline[0].label_code).toBeNull();
  });

  it("丢弃越界或重复的 signal_index", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          { signal_index: 0, label: "a" },
          { signal_index: 0, label: "duplicate" },
          { signal_index: 9, label: "out of range" },
          { signal_index: -1, label: "negative" },
        ],
      }),
      SIGNALS,
      "en",
    );
    expect(result.timeline).toHaveLength(1);
  });

  it("缺 label 时回落到按来源类型的 code 文案", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({ title: "t", summary: "s", timeline: [{ signal_index: 1 }] }),
      SIGNALS,
      "en",
    );
    expect(result.timeline[0].label_text).toBeNull();
    expect(result.timeline[0].label_code).toBe("timeline.community");
  });

  it("缺 title 时回落到首条信号标题", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({ summary: "s", timeline: [{ signal_index: 0, label: "a" }] }),
      SIGNALS,
      "en",
    );
    expect(result.title).toBe("OpenAI publishes GPT-6 announcement");
  });

  it("时间线为空视为失败——上层据此退回规则分析器", () => {
    expect(() =>
      parseAnalyzerResponse(JSON.stringify({ title: "t", timeline: [] }), SIGNALS, "en"),
    ).toThrow();
  });

  it("返回不是 JSON 时抛错", () => {
    expect(() => parseAnalyzerResponse("Sure! Here you go:", SIGNALS, "en")).toThrow();
  });

  it("时间线按时间升序排好，与模型给的顺序无关", () => {
    const result = parseAnalyzerResponse(
      JSON.stringify({
        title: "t",
        summary: "s",
        timeline: [
          { signal_index: 1, label: "later" },
          { signal_index: 0, label: "earlier" },
        ],
      }),
      SIGNALS,
      "en",
    );
    expect(result.timeline.map((e) => e.label_text)).toEqual(["earlier", "later"]);
  });
});
