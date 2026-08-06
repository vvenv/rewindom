import { describe, expect, it } from "vitest";

import { submissionSource, summarizeEntries } from "./form-submissions.js";

describe("summarizeEntries", () => {
  const entries = [
    { id: "a", label: "姓名", value: "小明" },
    { id: "b", label: "邮箱", value: "a@b.co" },
    { id: "c", label: "套餐", value: "Pro" },
    { id: "d", label: "留言", value: "你好" },
  ];

  it("拼成「标签: 值」，字段由租户定义，列固定不了", () => {
    expect(summarizeEntries(entries.slice(0, 2))).toBe(
      "姓名: 小明 · 邮箱: a@b.co",
    );
  });

  it("超出条数省略，行高才不会被一条长留言撑爆", () => {
    expect(summarizeEntries(entries)).toBe(
      "姓名: 小明 · 邮箱: a@b.co · 套餐: Pro …",
    );
  });

  it("空提交给空串而不是 undefined", () => {
    expect(summarizeEntries([])).toBe("");
  });
});

describe("submissionSource", () => {
  it("有标题用标题", () => {
    expect(
      submissionSource({ form_title: "联系我们", page_slug: "contact" }),
    ).toBe("联系我们");
  });

  it("标题空（或只有空格）时回落页面路径，不留一片空白", () => {
    expect(submissionSource({ form_title: "  ", page_slug: "contact" })).toBe(
      "/contact",
    );
  });
});
