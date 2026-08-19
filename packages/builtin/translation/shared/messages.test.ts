import { describe, expect, it } from "vitest";

import {
  guessSourceLanguage,
  isAlreadyInTargetLanguage,
  looksLikeTargetLanguage,
  widgetMessages,
} from "./messages.js";

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

describe("guessSourceLanguage", () => {
  it("中文正文猜 zh-CN", () => {
    expect(guessSourceLanguage("这是一条关于云服务故障的报道")).toBe("zh-CN");
  });

  it("英文正文猜 en", () => {
    expect(guessSourceLanguage("Bun 1.4 Rust rewrite is not looking good")).toBe(
      "en",
    );
  });

  it("中英混排按 CJK 占比判定，不被英文产品名带偏", () => {
    expect(guessSourceLanguage("OpenAI 发布了新的 GPT 模型，多个来源正在跟进")).toBe(
      "zh-CN",
    );
  });

  it("没有字母时不抛错", () => {
    expect(guessSourceLanguage("123 —— 456")).toBe("en");
  });
});

describe("isAlreadyInTargetLanguage（节点级：只翻内容，不翻界面）", () => {
  it("中文站的界面文案不送去翻译", () => {
    expect(isAlreadyInTargetLanguage("正在升温", "zh-CN")).toBe(true);
    expect(isAlreadyInTargetLanguage("刚刚开始爆发的事情", "zh-CN")).toBe(true);
    expect(isAlreadyInTargetLanguage("查看全部事件", "zh-CN")).toBe(true);
  });

  it("英文事件标题要翻 —— 短标题也不能因为长度被跳过", () => {
    expect(isAlreadyInTargetLanguage("Berd", "zh-CN")).toBe(false);
    expect(
      isAlreadyInTargetLanguage("Japan's Gen X workers are struggling", "zh-CN"),
    ).toBe(false);
  });

  it("纯数字 / 符号跳过", () => {
    expect(isAlreadyInTargetLanguage("2026-08-19", "zh-CN")).toBe(true);
    expect(isAlreadyInTargetLanguage(" · ", "zh-CN")).toBe(true);
  });

  it("目标为英文时，英文界面文案同样跳过、中文内容要翻", () => {
    expect(isAlreadyInTargetLanguage("View all events", "en")).toBe(true);
    expect(isAlreadyInTargetLanguage("云服务商报告大规模故障", "en")).toBe(false);
  });
});
