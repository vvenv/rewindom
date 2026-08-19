import { describe, expect, it } from "vitest";

import { maskTerms, survivedMasking, unmaskTerms } from "./term-guard.js";

/** 一次遮罩 → 假装引擎译过 → 还原。引擎行为用替换字母模拟。 */
function roundTrip(text: string, keep: string[] = []): string {
  const { masked, terms } = maskTerms(text, keep);
  return unmaskTerms(masked, terms);
}

describe("maskTerms", () => {
  it("保护 MODULE.md 里记下的那个翻车案例", () => {
    const { masked, terms } = maskTerms(
      "The IRS shut down Direct File this spring.",
    );
    expect(terms).toContain("Direct File");
    expect(masked).not.toContain("Direct File");
  });

  it("句首大写词不当专有名词", () => {
    const { terms } = maskTerms("Google said the outage is over.");
    // Google 仍会被全大写/CamelCase 之外的规则放过，句首不触发 title-case 连写
    expect(terms).not.toContain("Google said");
  });

  it("保护版本号、代码符号、URL、缩写", () => {
    const { terms } = maskTerms(
      "Ship v2.1.0 of foo.bar via https://a.example/x with the API and GPT-4.",
    );
    expect(terms).toContain("v2.1.0");
    expect(terms).toContain("foo.bar");
    expect(terms).toContain("https://a.example/x");
    expect(terms).toContain("API");
    expect(terms).toContain("GPT-4");
  });

  it("CamelCase 产品名整体保护，不被拆开", () => {
    const { terms } = maskTerms("OpenAI and GitHub both responded.");
    expect(terms).toContain("OpenAI");
    expect(terms).toContain("GitHub");
  });

  it("租户术语优先于内置规则，长的盖过短的", () => {
    const { terms } = maskTerms("Apple TV price rises", ["Apple TV", "Apple"]);
    expect(terms).toContain("Apple TV");
    expect(terms).not.toContain("Apple");
  });

  it("中文术语不加单词边界也能命中", () => {
    const { terms } = maskTerms("这是飞书文档的更新", ["飞书"]);
    expect(terms).toContain("飞书");
  });

  it("普通英文句子不产生占位符", () => {
    const { masked, terms } = maskTerms("the price went up again");
    expect(terms).toHaveLength(0);
    expect(masked).toBe("the price went up again");
  });

  it("区间不重叠：URL 内部的片段不再被单独抠出来", () => {
    const { terms } = maskTerms("see https://github.com/OpenAI/v1.2.3 now");
    expect(terms).toEqual(["https://github.com/OpenAI/v1.2.3"]);
  });
});

describe("unmaskTerms", () => {
  it("原样往返", () => {
    const text = "OpenAI ships v2.1.0 of Direct File to the API.";
    expect(roundTrip(text)).toBe(text);
  });

  it("容忍引擎在占位符内侧加空格", () => {
    const { terms } = maskTerms("OpenAI ships it");
    expect(unmaskTerms("⟦ 0 ⟧ 发布了它", terms)).toBe("OpenAI 发布了它");
  });

  it("认不出的编号原样留着，不抛错", () => {
    expect(unmaskTerms("⟦9⟧ x", ["A"])).toBe("⟦9⟧ x");
  });
});

describe("survivedMasking", () => {
  it("占位符齐全为 true", () => {
    const { terms } = maskTerms("OpenAI ships v1.2.3");
    expect(survivedMasking("⟦0⟧ 发布 ⟦1⟧", terms)).toBe(true);
  });

  it("引擎吞掉占位符时为 false —— 调用方据此回退原文", () => {
    const { terms } = maskTerms("OpenAI ships v1.2.3");
    expect(survivedMasking("发布了", terms)).toBe(false);
  });
});
