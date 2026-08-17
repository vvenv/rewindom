import { describe, expect, it } from "vitest";

import { resolveRefreshedContent, shouldReanalyze } from "./event-refresh.service.js";

const NOW = new Date("2025-08-12T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

describe("shouldReanalyze", () => {
  it("从没分析过一定要分析", () => {
    expect(shouldReanalyze(null, NOW, "llm")).toBe(true);
  });

  it("规则分析器没有成本，每次都重算", () => {
    expect(shouldReanalyze(minutesAgo(1), NOW, "heuristic")).toBe(true);
  });

  it("LLM 在冷却期内跳过——热点事件几分钟十几条信号，否则按信号数计费", () => {
    expect(shouldReanalyze(minutesAgo(5), NOW, "llm")).toBe(false);
  });

  it("LLM 过了冷却期恢复分析", () => {
    expect(shouldReanalyze(minutesAgo(31), NOW, "llm")).toBe(true);
  });
});

describe("resolveRefreshedContent", () => {
  const analysis = {
    title: "Analyzer title",
    summary: "Analyzer summary",
    analyzer: "heuristic",
  };

  it("人工改过的文案不被分析器覆盖", () => {
    expect(
      resolveRefreshedContent({
        manual_content: true,
        existing_title: "Editor title",
        existing_summary: "Editor summary",
        existing_analyzer: "manual",
        analysis,
        fallback_title: "Fallback",
      }),
    ).toEqual({
      title: "Editor title",
      summary: "Editor summary",
      analyzer: "manual",
    });
  });

  it("未改过时采用分析器产出；标题为空则回落到候选标题", () => {
    expect(
      resolveRefreshedContent({
        manual_content: false,
        existing_title: "Old",
        existing_summary: "Old summary",
        existing_analyzer: "heuristic",
        analysis: { title: "  ", summary: "New summary", analyzer: "llm" },
        fallback_title: "Fallback",
      }),
    ).toEqual({
      title: "Fallback",
      summary: "New summary",
      analyzer: "llm",
    });
  });
});
