import { describe, expect, it } from "vitest";

import { shouldReanalyze } from "./event-refresh.service.js";

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
