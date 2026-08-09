import { describe, expect, it } from "vitest";

import {
  docHeadingAnchor,
  extractDocHeadings,
  groupDocsByCategory,
  type PublicDocSummary,
} from "./marketing-doc.js";

function doc(slug: string, category: string): PublicDocSummary {
  return {
    slug,
    title: slug,
    description: "",
    category,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("groupDocsByCategory", () => {
  it("保留传入顺序，未分类的恒排最后", () => {
    const groups = groupDocsByCategory(
      [doc("a", ""), doc("b", "指南"), doc("c", "入门"), doc("d", "指南")],
      "其它",
    );
    expect(groups.map((group) => group.category)).toEqual([
      "指南",
      "入门",
      "其它",
    ]);
    expect(groups[0]!.items.map((item) => item.slug)).toEqual(["b", "d"]);
    expect(groups[2]!.items.map((item) => item.slug)).toEqual(["a"]);
  });
});

describe("docHeadingAnchor", () => {
  // 中文标题占多数：把非 ASCII 剥掉的话整份目录都锚不到任何地方
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
      ["## 安装", "", "```bash", "# 这是注释，不是标题", "```", "", "## 使用"].join(
        "\n",
      ),
    );
    expect(headings.map((item) => item.text)).toEqual(["安装", "使用"]);
  });

  // `#` 与 `##` 两端都渲成 <h2>，目录层级必须跟**渲染结果**一致
  it("把一级标题归到二级", () => {
    const headings = extractDocHeadings("# 标题\n\n### 三级\n");
    expect(headings).toEqual([
      { level: 2, text: "标题", anchor: "标题" },
      { level: 3, text: "三级", anchor: "三级" },
    ]);
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
