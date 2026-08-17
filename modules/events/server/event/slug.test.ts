import { describe, expect, it } from "vitest";

import { buildEventSlug, slugifyTitle } from "./slug.js";

describe("slugifyTitle", () => {
  it("空格与标点变连字符", () => {
    expect(slugifyTitle("OpenAI releases GPT-6!")).toBe("openai-releases-gpt-6");
  });

  it("去掉变音符号而不是整个字母", () => {
    expect(slugifyTitle("Café déjà vu")).toBe("cafe-deja-vu");
  });

  it("保留中文", () => {
    expect(slugifyTitle("模型 发布")).toBe("模型-发布");
  });

  it("截断后不留下末尾连字符", () => {
    const slug = slugifyTitle(`${"a".repeat(58)} tail`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("全是符号时回落到固定值", () => {
    expect(slugifyTitle("!!! ???")).toBe("event");
  });
});

describe("buildEventSlug", () => {
  it("拼上取自 id 的短后缀", () => {
    expect(buildEventSlug("GPT-6", "0e5a1b2c-3d4e-5f60-7a8b-9c0d1e2f3a4b")).toBe(
      "gpt-6-0e5a1b",
    );
  });

  it("同一标题不同事件不会撞 slug", () => {
    expect(buildEventSlug("GPT-6", "aaaaaaaa-0000-0000-0000-000000000000")).not.toBe(
      buildEventSlug("GPT-6", "bbbbbbbb-0000-0000-0000-000000000000"),
    );
  });
});
