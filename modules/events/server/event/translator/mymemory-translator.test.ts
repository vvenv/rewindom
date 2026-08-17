import { describe, expect, it } from "vitest";

import { readTranslation } from "./mymemory-translator.js";

describe("readTranslation", () => {
  const ok = (text: string): string =>
    JSON.stringify({ responseStatus: 200, responseData: { translatedText: text } });

  it("取出正常译文", () => {
    expect(readTranslation(ok("OpenAI 发布 GPT-6"), "OpenAI ships GPT-6")).toBe(
      "OpenAI 发布 GPT-6",
    );
  });

  it("状态码非 200 视为失败", () => {
    const body = JSON.stringify({
      responseStatus: 403,
      responseData: { translatedText: "whatever" },
    });
    expect(readTranslation(body, "x")).toBeNull();
  });

  it("额度耗尽的告警串不能被当成译文写进库", () => {
    expect(
      readTranslation(
        ok("MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY"),
        "OpenAI ships GPT-6",
      ),
    ).toBeNull();
  });

  it("超长告警同样拦掉", () => {
    expect(readTranslation(ok("QUERY LENGTH LIMIT EXCEEDED"), "x")).toBeNull();
  });

  it("译文与原文一模一样 = 没翻出来", () => {
    expect(readTranslation(ok("OpenAI ships GPT-6"), "OpenAI ships GPT-6")).toBeNull();
  });

  it("空译文 / 非字符串 / 坏 JSON 都返回 null", () => {
    expect(readTranslation(ok("   "), "x")).toBeNull();
    expect(
      readTranslation(
        JSON.stringify({ responseStatus: 200, responseData: { translatedText: 7 } }),
        "x",
      ),
    ).toBeNull();
    expect(readTranslation("<html>502</html>", "x")).toBeNull();
  });
});
