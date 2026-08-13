import { describe, expect, it } from "vitest";

import {
  docFilename,
  docHeadingAnchor,
  docsInLocale,
  extractDocHeadings,
  formatDocAsMarkdown,
  groupDocsByCategory,
  parseDuplicateDocBody,
  parseMarkdownFile,
  type PublicDocSummary,
} from "./site-doc.js";

function doc(slug: string, category: string, category_label = category): PublicDocSummary {
  return {
    slug,
    title: slug,
    description: "",
    category,
    category_label,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("groupDocsByCategory", () => {
  it("保留传入顺序，未分类的恒排最后且不编一个分类名出来", () => {
    const groups = groupDocsByCategory([
      doc("a", ""),
      doc("b", "guides", "指南"),
      doc("c", "intro", "入门"),
      doc("d", "guides", "指南"),
    ]);
    expect(groups.map((group) => group.category)).toEqual(["guides", "intro", ""]);
    expect(groups.map((group) => group.category_label)).toEqual([
      "指南",
      "入门",
      "",
    ]);
    expect(groups[0]!.items.map((item) => item.slug)).toEqual(["b", "d"]);
    expect(groups[2]!.items.map((item) => item.slug)).toEqual(["a"]);
  });

  it("全都没分类时只有一组散条目", () => {
    const groups = groupDocsByCategory([doc("a", ""), doc("b", "")]);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.category).toBe("");
  });
});

describe("docsInLocale", () => {
  const rows = [
    { slug: "a", locale: "zh-CN" },
    { slug: "b", locale: "en" },
    { slug: "c", locale: "zh-CN" },
  ];

  it("只留请求语言的那些", () => {
    const picked = docsInLocale(rows, "en", "zh-CN");
    expect(picked.locale).toBe("en");
    expect(picked.docs.map((row) => row.slug)).toEqual(["b"]);
  });

  it("该语言一篇都没有时整库回落主语言（不逐篇混排）", () => {
    const picked = docsInLocale(rows.slice(0, 1), "en", "zh-CN");
    expect(picked.locale).toBe("zh-CN");
    expect(picked.docs.map((row) => row.slug)).toEqual(["a"]);
  });

  it("locale 是脏值时按主语言算", () => {
    const picked = docsInLocale(
      [{ slug: "x", locale: "klingon" }],
      "zh-CN",
      "zh-CN",
    );
    expect(picked.docs.map((row) => row.slug)).toEqual(["x"]);
  });
});

describe("docHeadingAnchor", () => {
  it("保留中文", () => {
    expect(docHeadingAnchor("快速开始")).toBe("快速开始");
    expect(docHeadingAnchor("Getting Started!")).toBe("getting-started");
  });

  it("空标题也给一个可用的 id", () => {
    expect(docHeadingAnchor("###")).toBe("section");
  });
});

describe("extractDocHeadings", () => {
  it("跳过围栏代码块里的 # 行", () => {
    const headings = extractDocHeadings(
      [
        "## 安装",
        "",
        "```bash",
        "# 这是注释，不是标题",
        "```",
        "",
        "## 使用",
      ].join("\n"),
    );
    expect(headings.map((item) => item.text)).toEqual(["安装", "使用"]);
  });

  it("跳过正文一级标题", () => {
    const headings = extractDocHeadings("# 标题\n\n### 三级\n");
    expect(headings).toEqual([{ level: 3, text: "三级", anchor: "三级" }]);
  });

  it("按 depth 设置裁掉更深的层级", () => {
    const headings = extractDocHeadings("## 二级\n\n### 三级\n", { max: 2 });
    expect(headings.map((item) => item.text)).toEqual(["二级"]);
  });

  it("剥掉标题里的行内标记，锚点与正文一致", () => {
    const [heading] = extractDocHeadings("## `pnpm dev` 与 **构建**\n");
    expect(heading!.text).toBe("pnpm dev 与 构建");
    expect(heading!.anchor).toBe(docHeadingAnchor(heading!.text));
  });
});

describe("parseMarkdownFile", () => {
  it("解析 frontmatter 与正文", () => {
    const parsed = parseMarkdownFile(
      "guide.md",
      `---
title: 指南
description: 简述
category: 入门
sort_order: 15
---
## 正文
`,
    );
    expect(parsed).toEqual({
      slug: "guide",
      locale: null,
      title: "指南",
      description: "简述",
      category: "入门",
      sort_order: 15,
      body_md: "## 正文",
    });
  });

  it("没写 sort_order 时是 null，不是 0——导入不该重置既有排序", () => {
    expect(parseMarkdownFile("guide.md", "正文").sort_order).toBeNull();
    expect(
      parseMarkdownFile("guide.md", "---\nsort_order: 0\n---\n正文").sort_order,
    ).toBe(0);
  });

  it("文件名的语言后缀被认出来，slug 不带它", () => {
    const parsed = parseMarkdownFile("faq.en.md", "正文");
    expect(parsed.slug).toBe("faq");
    expect(parsed.locale).toBe("en");
    // 大小写不敏感：`zh-cn` 也认
    expect(parseMarkdownFile("faq.zh-cn.md", "正文").locale).toBe("zh-CN");
  });

  it("frontmatter 的 locale 覆盖文件名——文件可能被改过名", () => {
    const parsed = parseMarkdownFile(
      "faq.en.md",
      "---\nlocale: zh-CN\n---\n正文",
    );
    expect(parsed.locale).toBe("zh-CN");
  });

  it("点后面认不出语言时整段当 slug 校验", () => {
    expect(() => parseMarkdownFile("faq.v2.md", "正文")).toThrow(
      "site.doc_slug_invalid",
    );
  });
});

describe("docFilename", () => {
  it("主语言不带后缀，其余语言带——否则导出全部会重名", () => {
    expect(docFilename("faq", "zh-CN", "zh-CN")).toBe("faq.md");
    expect(docFilename("faq", "en", "zh-CN")).toBe("faq.en.md");
  });

  it("导出再导入是闭环的", () => {
    const markdown = formatDocAsMarkdown({
      slug: "faq",
      locale: "en",
      title: "FAQ",
      description: "Common questions",
      category: "Getting started",
      sort_order: 120,
      body_md: "## Body",
    });
    const parsed = parseMarkdownFile(
      docFilename("faq", "en", "zh-CN"),
      markdown,
    );
    expect(parsed).toEqual({
      slug: "faq",
      locale: "en",
      title: "FAQ",
      description: "Common questions",
      category: "Getting started",
      sort_order: 120,
      body_md: "## Body",
    });
  });
});

describe("parseDuplicateDocBody", () => {
  it("accepts title and locale", () => {
    expect(
      parseDuplicateDocBody({ title: "Getting started", locale: "en" }),
    ).toEqual({ title: "Getting started", locale: "en" });
  });

  it("allows omitting locale", () => {
    expect(parseDuplicateDocBody({ title: "快速开始" })).toEqual({
      title: "快速开始",
      locale: null,
    });
  });

  it("rejects blank title and unknown locale", () => {
    expect(() => parseDuplicateDocBody({ title: "  " })).toThrow(
      "site.doc_title_required",
    );
    expect(() =>
      parseDuplicateDocBody({ title: "X", locale: "klingon" }),
    ).toThrow("site.locale_invalid");
  });
});
