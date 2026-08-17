import { describe, expect, it } from "vitest";

import {
  carryOverTranslations,
  shouldReanalyze,
} from "./event-refresh.service.js";

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

describe("carryOverTranslations", () => {
  const stored = { en: "OpenAI ships GPT-6", "zh-CN": "OpenAI 发布 GPT-6" };

  it("原文没变时整表留用——一个字符都不该重翻", () => {
    expect(
      carryOverTranslations(stored, "OpenAI ships GPT-6", "OpenAI ships GPT-6", "en", {
        en: "OpenAI ships GPT-6",
      }),
    ).toEqual(stored);
  });

  it("原文变了就整表作废——旧译文会拿旧标题冒充新事件", () => {
    expect(
      carryOverTranslations(stored, "OpenAI ships GPT-6", "OpenAI delays GPT-6", "en", {
        en: "OpenAI delays GPT-6",
      }),
    ).toEqual({ en: "OpenAI delays GPT-6" });
  });

  it("本轮分析给出的译文覆盖旧译文（LLM 路径）", () => {
    expect(
      carryOverTranslations(stored, "OpenAI ships GPT-6", "OpenAI ships GPT-6", "en", {
        en: "OpenAI ships GPT-6",
        "zh-CN": "OpenAI 推出 GPT-6",
      })["zh-CN"],
    ).toBe("OpenAI 推出 GPT-6");
  });

  it("存量行没有语言表时按原文列判断新鲜度", () => {
    expect(
      carryOverTranslations(null, "OpenAI ships GPT-6", "OpenAI ships GPT-6", "en", {
        en: "OpenAI ships GPT-6",
      }),
    ).toEqual({ en: "OpenAI ships GPT-6" });
  });

  it("原文为空时不复用（无从判断新鲜度）", () => {
    expect(
      carryOverTranslations({ en: "" }, "", "New title", "en", { en: "New title" }),
    ).toEqual({ en: "New title" });
  });
});
