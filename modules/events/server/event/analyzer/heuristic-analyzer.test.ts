import { describe, expect, it } from "vitest";

import { heuristicAnalyzer } from "./heuristic-analyzer.js";

import type { AnalyzerSignal } from "./analyzer.js";

function signal(overrides: Partial<AnalyzerSignal> = {}): AnalyzerSignal {
  return {
    signal_id: "sig-1",
    title: "OpenAI releases GPT-6 with realtime video",
    url: "https://openai.com/blog/gpt-6",
    excerpt: "Official excerpt.",
    source_name: "OpenAI Blog",
    source_kind: "official",
    published_at: new Date("2025-08-12T10:02:00Z"),
    ...overrides,
  };
}

async function analyze(signals: AnalyzerSignal[]) {
  return heuristicAnalyzer.analyze({ topic: "ai", origin_locale: "en", signals });
}

describe("heuristicAnalyzer", () => {
  it("标记为 heuristic，界面据此说明摘要出处", () => {
    expect(heuristicAnalyzer.id).toBe("heuristic");
  });

  it("摘要取一手来源的原文摘录，而不是社区转述", async () => {
    const result = await analyze([
      signal({
        signal_id: "s1",
        source_kind: "community",
        source_name: "Hacker News",
        excerpt: "Community chatter.",
        published_at: new Date("2025-08-12T09:00:00Z"),
      }),
      signal({ signal_id: "s2", excerpt: "Official excerpt." }),
    ]);
    expect(result.summary).toBe("Official excerpt.");
  });

  it("没有任何摘录时留空，不硬凑一句没有出处的话", async () => {
    const result = await analyze([signal({ excerpt: "   " })]);
    expect(result.summary).toBe("");
  });

  it("超长摘录被截断", async () => {
    const result = await analyze([signal({ excerpt: "x".repeat(1000) })]);
    expect(result.summary.length).toBeLessThanOrEqual(420);
    expect(result.summary.endsWith("…")).toBe(true);
  });

  it("时间线按时间升序，且首格标记为 firstSeen", async () => {
    const result = await analyze([
      signal({
        signal_id: "s2",
        source_name: "TechCrunch",
        source_kind: "news",
        published_at: new Date("2025-08-12T11:42:00Z"),
      }),
      signal({ signal_id: "s1", published_at: new Date("2025-08-12T10:02:00Z") }),
    ]);
    expect(result.timeline.map((entry) => entry.signal_id)).toEqual(["s1", "s2"]);
    expect(result.timeline[0].label_code).toBe("timeline.firstSeen");
    expect(result.timeline[1].label_code).toBe("timeline.news");
  });

  it("同一来源再次出现时降级为补充说明", async () => {
    const result = await analyze([
      signal({ signal_id: "s1", published_at: new Date("2025-08-12T10:02:00Z") }),
      signal({
        signal_id: "s2",
        source_name: "Hacker News",
        source_kind: "community",
        published_at: new Date("2025-08-12T10:17:00Z"),
      }),
      signal({ signal_id: "s3", published_at: new Date("2025-08-12T12:15:00Z") }),
    ]);
    expect(result.timeline[2].label_code).toBe("timeline.officialUpdate");
  });

  it("规则实现永远不产出自由文案", async () => {
    const result = await analyze([signal()]);
    expect(result.timeline.every((entry) => entry.label_text === null)).toBe(true);
  });

  it("时间线过长时保头保尾", async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      signal({
        signal_id: `s${i}`,
        source_name: `Source ${i}`,
        published_at: new Date(Date.UTC(2025, 7, 12, 10, i)),
      }),
    );
    const result = await analyze(many);
    expect(result.timeline).toHaveLength(12);
    expect(result.timeline[0].signal_id).toBe("s0");
    expect(result.timeline.at(-1)?.signal_id).toBe("s29");
  });

  it("标题从候选里挑信息量最高的一条", async () => {
    const result = await analyze([
      signal({ signal_id: "s1", title: "GPT-6" }),
      signal({
        signal_id: "s2",
        title: "OpenAI releases GPT-6 with realtime video",
        published_at: new Date("2025-08-12T10:05:00Z"),
      }),
    ]);
    expect(result.title).toBe("OpenAI releases GPT-6 with realtime video");
  });
});
