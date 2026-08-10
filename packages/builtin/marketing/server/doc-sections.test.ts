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
    category: "intro",
    category_label: "入门",
    sort_order: 0,
    updated_at: "2026-03-01T00:00:00.000Z",
  },
  {
    slug: "modules",
    title: "模块",
    description: "",
    category: "advanced",
    category_label: "进阶",
    sort_order: 0,
    updated_at: "2026-03-02T00:00:00.000Z",
  },
];

/** 没填分类的一篇：目录里应当直接列在顶层，而不是被归进一个编出来的分类。 */
const LOOSE = {
  slug: "changelog",
  title: "更新日志",
  description: "",
  category: "",
  category_label: "",
  sort_order: 9,
  updated_at: "2026-03-03T00:00:00.000Z",
};

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

  // 没填分类的不该被塞进一个凭空冒出来的「其它」分类里
  it("没填分类的条目照样列，但不编一个分类抬头出来", () => {
    const html = render("doc-list", {}, { docs: [...DOCS, LOOSE] });
    expect(html).toContain(docPath("changelog"));
    expect(html).not.toContain("其它");
    expect(html.match(/doc-list-group-title/gu)?.length).toBe(2);
  });

  it("按分类筛选，只列那一类", () => {
    const html = render("doc-list", { category: "advanced" }, { docs: DOCS });
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
    /*
     * 断的是**渲染出来的那一段**，不是「原文有没有出现在 HTML 里」。
     *
     * 摘要另外还会进每条 `<li>` 的 `data-doc-search`（公开站的搜索靠它过滤），
     * 而搜索该不该匹配摘要与「列表上显不显示摘要」是两件事——客户端的
     * `matchesDocSearch` 也一直是无条件匹配摘要的。
     */
    expect(html).not.toContain(`<span class="muted">五分钟装好</span>`);
    expect(html).toContain("更新于");
  });

  /*
   * 段内不再自带搜索框：唯一入口收到了页头（`show_doc_search`）。以前两个框会
   * 同时出现在文档索引上，做的还是同一件事。
   */
  it("不再渲染段内搜索框", () => {
    const html = render("doc-list", {}, { docs: DOCS });
    expect(html).not.toContain("doc-list-search");
    expect(html).not.toContain(`placeholder="搜索文档"`);
  });

  // 页头搜索跳过来的 `?q=` 靠这个属性过滤，缺了等于搜索整个失灵
  it("每条都带可搜索文本，供页头搜索落地时过滤", () => {
    const html = render("doc-list", {}, { docs: DOCS });
    expect(html).toContain(
      `data-doc-search="安装 install 五分钟装好 intro 入门"`,
    );
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

  /*
   * 不为分类而分类：只有一个分类时那条抬头什么也没分开，没填分类的更是没有抬头
   * 可画——条目直接铺在顶层。
   */
  it("只有一个分类时不画分类抬头", () => {
    const html = render("doc-nav", {}, { docs: [DOCS[0]!] });
    expect(html).toContain(docPath("install"));
    expect(html).not.toContain("doc-nav-group-title");
  });

  it("没填分类的条目列在顶层，不编一个分类名出来", () => {
    const html = render("doc-nav", {}, { docs: [...DOCS, LOOSE] });
    expect(html).toContain(docPath("changelog"));
    expect(html).not.toContain("其它");
    expect(html.match(/doc-nav-group-title/gu)?.length).toBe(2);
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
      {
        show_title: false,
        show_category: false,
        show_updated: false,
        show_back: false,
      },
      { doc: DOC },
    );
    expect(html).not.toContain("<h1>");
    expect(html).not.toContain("doc-article-meta");
    expect(html).not.toContain("doc-article-back");
  });

  // 分类与日期各是一个开关：只留其一是文档站里最常见的那种要求
  it("元信息两项可以各开各的", () => {
    const html = render("doc-article", { show_category: false }, { doc: DOC });
    expect(html).toContain("doc-article-meta");
    expect(html).not.toContain("doc-tag");
    expect(html).toContain("更新于");
  });

  it("元信息可以移到标题下方", () => {
    const html = render(
      "doc-article",
      { meta_position: "below" },
      { doc: DOC },
    );
    expect(html.indexOf("doc-article-meta")).toBeGreaterThan(
      html.indexOf("<h1>"),
    );
  });

  it("返回链接的文案与目标可以自定义", () => {
    const html = render(
      "doc-article",
      { back_label: "回到帮助中心", back_href: "/help" },
      { doc: DOC },
    );
    expect(html).toContain('href="/help"');
    expect(html).toContain("回到帮助中心");
    expect(html).not.toContain("返回文档");
  });

  // 自定义站内目标同样要补语言前缀，否则英文页上的返回链会跳回中文站
  it("自定义站内目标补当前语言前缀，外链原样", () => {
    const zh = render(
      "doc-article",
      { back_href: "/help" },
      { doc: DOC, locale: "en", defaultLocale: "zh-CN" },
    );
    expect(zh).toContain('href="/en/help"');

    const external = render(
      "doc-article",
      { back_href: "https://example.com/help" },
      { doc: DOC, locale: "en", defaultLocale: "zh-CN" },
    );
    expect(external).toContain('href="https://example.com/help"');
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
    // 匹配独立的 grp-col 类，不包含 grp-col-divider
    expect(html.match(/grp-col(?!-)/gu)?.length).toBe(3);
  });
});
