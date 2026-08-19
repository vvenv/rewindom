import { describe, expect, it } from "vitest";

import { looksLikeTargetLanguage, widgetMessages } from "./messages.js";

describe("widgetMessages", () => {
  it("按 locale 取，未知 locale 回落 zh-CN", () => {
    expect(widgetMessages("en").translate).toBe("Translate");
    expect(widgetMessages("zh-CN").translate).toBe("翻译此页");
  });

  it("显式标注机器翻译", () => {
    expect(widgetMessages("zh-CN").machineNote).toContain("机器翻译");
    expect(widgetMessages("en").machineNote).toContain("Machine translated");
  });
});

describe("looksLikeTargetLanguage", () => {
  const english =
    "The cloud provider reported a major outage affecting several regions this morning.";
  const chinese =
    "该云服务商今天上午报告了一起影响多个区域的大规模故障，目前仍在恢复当中。";

  it("中文正文 + 中文目标 = 不用翻", () => {
    expect(looksLikeTargetLanguage(chinese, "zh-CN")).toBe(true);
  });

  it("英文正文 + 中文目标 = 要翻", () => {
    expect(looksLikeTargetLanguage(english, "zh-CN")).toBe(false);
  });

  it("英文正文 + 英文目标 = 不用翻", () => {
    expect(looksLikeTargetLanguage(english, "en")).toBe(true);
  });

  it("中文正文 + 英文目标 = 要翻", () => {
    expect(looksLikeTargetLanguage(chinese, "en")).toBe(false);
  });

  it("样本太短时不显示入口", () => {
    expect(looksLikeTargetLanguage("ok", "zh-CN")).toBe(true);
  });
});
