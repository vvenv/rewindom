import { describe, expect, it } from "vitest";

import {
  buildSystemPrompt,
  parseGeneratedContent,
} from "./content-generate.service.js";

import { EMPTY_OUTPUT_RULES } from "../shared/index.js";

describe("parseGeneratedContent", () => {
  it("reads title, body, and tags", () => {
    expect(
      parseGeneratedContent(
        JSON.stringify({
          title: " Spring walk ",
          body: "Sunlight on the street.\n\n#walk #city",
          tags: ["#walk", "city", ""],
        }),
      ),
    ).toEqual({
      title: "Spring walk",
      body: "Sunlight on the street.\n\n#walk #city",
      tags: ["walk", "city"],
    });
  });

  it("rejects missing body", () => {
    expect(() => parseGeneratedContent(JSON.stringify({ title: "x" }))).toThrow(
      "missing_fields",
    );
  });
});

describe("buildSystemPrompt", () => {
  it("没有模板时用体裁默认，标题与标签的数字只出现一次", () => {
    const prompt = buildSystemPrompt("note", null);
    expect(prompt).toContain("Title: at most 40 characters.");
    expect(prompt).toContain("Hashtags: 3 to 8.");
    // 基础提示里不该再写死一份数字，否则两条要求会互相打架
    expect(prompt.match(/at most 40 characters/gu)).toHaveLength(1);
  });

  it("模板的输出约束覆盖体裁默认", () => {
    const prompt = buildSystemPrompt("note", {
      guidelines: "",
      output_rules: { ...EMPTY_OUTPUT_RULES, title_max: 20 },
      samples: [],
    });
    expect(prompt).toContain("Title: at most 20 characters.");
    expect(prompt).not.toContain("at most 40 characters");
    // 模板没定的项落回默认，而不是变成「不限」
    expect(prompt).toContain("Hashtags: 3 to 8.");
  });

  it("写作规则与范文都进 prompt，且范文明说只学风格", () => {
    const prompt = buildSystemPrompt("note", {
      guidelines: "用第一人称写",
      output_rules: { ...EMPTY_OUTPUT_RULES },
      samples: [{ title: "旧稿", body: "正文" }],
    });
    expect(prompt).toContain("用第一人称写");
    expect(prompt).toContain("旧稿");
    expect(prompt).toContain("Never reuse their facts");
  });
});
