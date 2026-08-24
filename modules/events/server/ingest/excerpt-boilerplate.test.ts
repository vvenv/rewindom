import { describe, expect, it } from "vitest";

import {
  BOILERPLATE_MIN_REPEATS,
  MAX_BOILERPLATE_LENGTH,
  isBoilerplateExcerpt,
} from "./excerpt-boilerplate.js";

/**
 * 案例全部取自本地库真实语料（tenant f098…）——改判据前先看这里。
 */
describe("isBoilerplateExcerpt", () => {
  it("Lobsters 的「Comments」出现 53 次：是模板", () => {
    expect(isBoilerplateExcerpt("Comments", 53)).toBe(true);
  });

  it("Hugging Face 的站点简介出现 23 次：是模板", () => {
    expect(
      isBoilerplateExcerpt(
        "We're on a journey to advance and democratize artificial intelligence through open source and open science.",
        23,
      ),
    ).toBe(true);
  });

  it("重复两次不算 —— 可能是源换 URL 重发的同一篇", () => {
    expect(
      isBoilerplateExcerpt("Please refer to CHANGELOG.md for details.", 2),
    ).toBe(false);
    expect(
      isBoilerplateExcerpt(
        "Please refer to CHANGELOG.md for details.",
        BOILERPLATE_MIN_REPEATS,
      ),
    ).toBe(true);
  });

  it("长文本逐字重复不算模板 —— 那是重复采集，交给身份键", () => {
    const article = "x".repeat(MAX_BOILERPLATE_LENGTH + 1);
    expect(isBoilerplateExcerpt(article, 9)).toBe(false);
  });

  it("空摘录不参与 —— 它已经是空摘录那条路径的事", () => {
    expect(isBoilerplateExcerpt("", 99)).toBe(false);
    expect(isBoilerplateExcerpt("   ", 99)).toBe(false);
  });
});
