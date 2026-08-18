import { describe, expect, it } from "vitest";

import { resolveRefreshedContent, shouldReanalyze } from "./event-refresh.service.js";

const NOW = new Date("2025-08-12T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

describe("shouldReanalyze", () => {
  const base = {
    analyzed_at: minutesAgo(1),
    previous_signal_count: 3,
    signal_count: 3,
    now: NOW,
    analyzer_id: "heuristic",
  };

  it("从没分析过一定要分析", () => {
    expect(
      shouldReanalyze({ ...base, analyzed_at: null, analyzer_id: "llm" }),
    ).toBe(true);
  });

  /*
   * 这条是整个改动的要害。降温扫描每轮捞最多 200 个**空闲 ≥6h** 的事件，
   * 它们按定义没有新信号；曾经 heuristic 恒重算、llm 只看 30 分钟冷却，
   * 于是每轮几百次无谓分析（llm 下就是几百次模型调用）。
   * 分析器是信号集合的纯函数——信号没变，输出必然相同，跳过不损失任何东西。
   */
  it("信号集合没变就不分析，无论哪个实现", () => {
    expect(shouldReanalyze({ ...base, analyzer_id: "heuristic" })).toBe(false);
    expect(
      shouldReanalyze({
        ...base,
        analyzer_id: "llm",
        analyzed_at: minutesAgo(600),
      }),
    ).toBe(false);
  });

  it("来了新信号，规则实现立即重算", () => {
    expect(shouldReanalyze({ ...base, signal_count: 4 })).toBe(true);
  });

  it("信号被保留期清掉也算变化", () => {
    expect(shouldReanalyze({ ...base, signal_count: 2 })).toBe(true);
  });

  it("LLM 在冷却期内跳过——热点事件几分钟十几条信号，否则按信号数计费", () => {
    expect(
      shouldReanalyze({
        ...base,
        analyzer_id: "llm",
        signal_count: 4,
        analyzed_at: minutesAgo(5),
      }),
    ).toBe(false);
  });

  it("LLM 过了冷却期且有新信号才恢复分析", () => {
    expect(
      shouldReanalyze({
        ...base,
        analyzer_id: "llm",
        signal_count: 4,
        analyzed_at: minutesAgo(31),
      }),
    ).toBe(true);
  });

  it("顺序不能反：过了冷却期但信号没变，仍然不分析", () => {
    expect(
      shouldReanalyze({
        ...base,
        analyzer_id: "llm",
        analyzed_at: minutesAgo(31),
      }),
    ).toBe(false);
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
