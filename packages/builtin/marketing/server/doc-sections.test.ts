/**
 * `doc-*` 段的 SSR 行为。
 *
 * 结构与客户端的对齐由 `section-structure.test.tsx` 守着，这里管的是**取数**：
 * 上下文里没有文档时不许渲染出空壳，筛选 / 限条数 / 分组要照设置来，
 * 目录锚点要能对上正文里真正发出来的 id。
 */

import { describe, expect, it } from "vitest";

import { docPath, type PublicDocDetail } from "../shared/marketing-doc.js";
import { buildDocTemplateSections } from "../shared/page-presets.js";
import { createSection, type SiteSection } from "../shared/section-schema.js";
import { renderSectionHtml } from "../shared/sections/html.js";

import type { SectionRenderContext } from "../shared/sections/render-context.js";

const DOCS = [
  {
    slug: "install",
    title: "安装",
    description: "五分钟装好",
    category: "入门",
    sort_order: 0,
    updated_at: "2026-03-01T00:00:00.000Z",
  },
  {
    slug: "modules",
    title: "模块",
    description: "",
    category: "进阶",
    sort_order: 0,
    updated_at: "2026-03-02T00:00:00.000Z",
  },
];

const DOC: PublicDocDetail = {
  ...DOCS[0]!,
  body_md: "## 准备\n\n正文\n\n### 依赖\n\n正文",
};

function section(type: string, settings: Record<string, unknown>): SiteSection {
  const created = createSection(type);
  created.settings = { ...created.settings, ...settings } as never;
  return created;
}

function render(
  type: string,
  settings: Record<string, unknown>,
  ctx: SectionRenderContext = {},
): string {
  return renderSectionHtml(section(type, settings), 0, {
    locale: "zh-CN",
    defaultLocale: "zh-CN",
    ...ctx,
  });
}

describe("doc-list", () => {
  it("没有文档时整段不输出", () => {
    expect(render("doc-list", {}, { docs: [] })).toBe("");
  });

  it("按分类分组，卡片链到各自的文档地址", () => {
    const html = render("doc-list", {}, { docs: DOCS });
    expect(html).toContain("入门");
    expect(html).toContain("进阶");
    expect(html).toContain(`href="${docPath("install")}"`);
    expect(html).toContain("五分钟装好");
  });

  it("group_by=none 时不出分组抬头", () => {
    const html = render("doc-list", { group_by: "none" }, { docs: DOCS });
    expect(html).not.toContain("doc-list-group-title");
  });

  it("按分类筛选，只列那一类", () => {
    const html = render("doc-list", { category: "进阶" }, { docs: DOCS });
    expect(html).toContain(docPath("modules"));
    expect(html).not.toContain(docPath("install"));
  });

  // 首页放「最新几篇」就是这个设置；0 表示不限
  it("limit 截断条数", () => {
    const html = render(
      "doc-list",
      { limit: 1, group_by: "none" },
      { docs: DOCS },
    );
    expect(html).toContain(docPath("install"));
    expect(html).not.toContain(docPath("modules"));
  });

  it("show_description / show_updated 各自可关", () => {
    const html = render(
      "doc-list",
      { show_description: false, show_updated: true },
      { docs: DOCS },
    );
    expect(html).not.toContain("五分钟装好");
    expect(html).toContain("更新于");
  });
});

describe("doc-nav", () => {
  it("当前这一篇标 aria-current", () => {
    const html = render(
      "doc-nav",
      {},
      { docs: DOCS, currentPath: docPath("modules") },
    );
    expect(html).toMatch(
      new RegExp(`href="${docPath("modules")}" aria-current="page"`, "u"),
    );
    expect(html).not.toMatch(
      new RegExp(`href="${docPath("install")}" aria-current`, "u"),
    );
  });

  it("没有文档时整段不输出", () => {
    expect(render("doc-nav", {}, { docs: [] })).toBe("");
  });
});

describe("doc-article", () => {
  // 索引页与普通页面上没有「当前文档」，那时这一段该彻底消失而不是露个空壳
  it("上下文里没有当前文档时不输出", () => {
    expect(render("doc-article", {}, { docs: DOCS })).toBe("");
  });

  it("渲染标题、元信息与正文", () => {
    const html = render("doc-article", {}, { doc: DOC });
    expect(html).toContain("<h1>安装</h1>");
    expect(html).toContain("入门");
    expect(html).toContain("更新于");
    expect(html).toContain('<div class="prose">');
  });

  it("开关关掉后对应部件不出现", () => {
    const html = render(
      "doc-article",
      { show_title: false, show_meta: false, show_back: false },
      { doc: DOC },
    );
    expect(html).not.toContain("<h1>");
    expect(html).not.toContain("doc-article-meta");
    expect(html).not.toContain("doc-article-back");
  });
});

describe("doc-toc", () => {
  it("锚点与正文里真正发出来的 heading id 一致", () => {
    const toc = render("doc-toc", {}, { doc: DOC });
    const article = render("doc-article", {}, { doc: DOC });
    expect(toc).toContain('href="#准备"');
    expect(article).toContain('id="准备"');
  });

  it("depth=2 时不列三级标题", () => {
    const html = render("doc-toc", { depth: "2" }, { doc: DOC });
    expect(html).toContain("准备");
    expect(html).not.toContain("依赖");
  });

  it("正文没有小标题时不输出", () => {
    expect(
      render("doc-toc", {}, { doc: { ...DOC, body_md: "只有正文" } }),
    ).toBe("");
  });
});

describe("内置兜底版式", () => {
  const t = (key: string): string => key;

  it("索引页默认列出文档", () => {
    const html = buildDocTemplateSections("doc_index", t)
      .map((section) => renderSectionHtml(section, 0, { docs: DOCS }))
      .join("");
    expect(html).toContain(docPath("install"));
  });

  // 三栏（目录 + 正文 + 章节）是文档站的通行版式，也是 3:7:2 这档列宽的用例
  it("详情页默认三栏：目录 + 正文 + 章节导航", () => {
    const html = buildDocTemplateSections("doc_article", t)
      .map((section) =>
        renderSectionHtml(section, 0, {
          docs: DOCS,
          doc: DOC,
          currentPath: docPath(DOC.slug),
        }),
      )
      .join("");
    expect(html).toContain("doc-nav");
    expect(html).toContain("doc-article");
    expect(html).toContain("doc-toc");
    expect(html.match(/grp-col/gu)?.length).toBe(3);
  });
});
