import { describe, expect, it } from "vitest";

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  normalizeOptionalLocale,
  parseAcceptLanguage,
} from "./locale.js";

describe("locale", () => {
  it("normalizeLocale 非法值回落到默认", () => {
    expect(normalizeLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("ja")).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
  });

  it("normalizeOptionalLocale 用 null 表示继承", () => {
    expect(normalizeOptionalLocale("en")).toBe("en");
    expect(normalizeOptionalLocale("ja")).toBeNull();
    expect(normalizeOptionalLocale(undefined)).toBeNull();
  });

  it("parseAcceptLanguage 按 q 值挑选支持的语言", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9,zh-CN;q=0.8")).toBe("en");
    expect(parseAcceptLanguage("zh-Hans-CN,zh;q=0.9")).toBe("zh-CN");
    expect(parseAcceptLanguage("ja,fr;q=0.8")).toBe(DEFAULT_LOCALE);
    expect(parseAcceptLanguage(null)).toBe(DEFAULT_LOCALE);
  });
});
