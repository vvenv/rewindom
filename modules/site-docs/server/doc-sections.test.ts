/**
 * `site-docs.*` 段的 SSR 行为。
 *
 * 结构与客户端的对齐由 marketing 的 `section-structure.test.tsx` 守着，这里管的是
 * **取数**：`contributed["site-docs"]` 里没有文档时不许渲染出空壳，筛选 / 限条数 /
 * 分组要照设置来，目录锚点要能对上正文里真正发出来的 id。
 */

import { type AppLocale } from "@rewindom/module-sdk/server";
import { beforeAll, describe, expect, it } from "vitest";

import { createSection } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { renderSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";
import { SITE_DOCS_ENTITLEMENT } from "../shared/entitlements.js";
import {
  buildDocsTemplateSections,
  DOCS_ARTICLE_PAGE_KIND,
  DOCS_INDEX_PAGE_KIND,
} from "../shared/page-templates.js";
import {
  SITE_DOCS_ARTICLE_SECTION_TYPE,
  SITE_DOCS_LIST_SECTION_TYPE,
  SITE_DOCS_NAV_SECTION_TYPE,
  SITE_DOCS_TOC_SECTION_TYPE,
} from "../shared/section-types.js";
import { docPath, type PublicDocDetail } from "../shared/site-doc.js";
import { siteDocsContextEntry } from "../shared/site-docs-context.js";

import { registerDocsSections } from "./register.js";

import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

const ENABLED = new Set([SITE_DOCS_ENTITLEMENT.key]);

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

function docsCtx(input: {
  docs?: typeof DOCS | Array<typeof DOCS[number] | typeof LOOSE>;
  doc?: PublicDocDetail;
  query?: string;
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
} = {}): SectionRenderContext {
  return {
    locale: input.locale ?? "zh-CN",
    defaultLocale: input.defaultLocale ?? "zh-CN",
    currentPath: input.currentPath,
    enabledEntitlements: ENABLED,
    contributed: siteDocsContextEntry({
      docs: input.docs ?? [],
      doc: input.doc,
      docsIndexPath: "/docs",
      query: input.query,
    }),
  };
}

function render(
  type: string,
  settings: Record<string, unknown>,
  ctx: SectionRenderContext = docsCtx(),
): string {
  return renderSectionHtml(section(type, settings), 0, ctx);
}

beforeAll(() => {
  registerDocsSections();
});

describe("site-docs.list", () => {
  it("没有文档时整段不输出", () => {
    expect(render(SITE_DOCS_LIST_SECTION_TYPE, {}, docsCtx({ docs: [] }))).toBe(
      "",
    );
  });

  it("按分类分组，卡片链到各自的文档地址", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      {},
      docsCtx({ docs: DOCS }),
    );
    expect(html).toContain("入门");
    expect(html).toContain("进阶");
    expect(html).toContain(`href="${docPath("install")}"`);
    expect(html).toContain("五分钟装好");
  });

  it("group_by=none 时不出分组抬头", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      { group_by: "none" },
      docsCtx({ docs: DOCS }),
    );
    expect(html).not.toContain("doc-list-group-title");
  });

  it("没填分类的条目照样列，但不编一个分类抬头出来", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      {},
      docsCtx({ docs: [...DOCS, LOOSE] }),
    );
    expect(html).toContain(docPath("changelog"));
    expect(html).not.toContain("其它");
    expect(html.match(/doc-list-group-title/gu)?.length).toBe(2);
  });

  it("按分类筛选，只列那一类", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      { category: "advanced" },
      docsCtx({ docs: DOCS }),
    );
    expect(html).toContain(docPath("modules"));
    expect(html).not.toContain(docPath("install"));
  });

  it("limit 截断条数", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      { limit: 1, group_by: "none" },
      docsCtx({ docs: DOCS }),
    );
    expect(html).toContain(docPath("install"));
    expect(html).not.toContain(docPath("modules"));
  });

  it("show_description / show_updated 各自可关", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      { show_description: false, show_updated: true },
      docsCtx({ docs: DOCS }),
    );
    expect(html).not.toContain(`<span class="muted">五分钟装好</span>`);
    expect(html).toContain("更新于");
  });

  it("不再渲染段内搜索框", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      {},
      docsCtx({ docs: DOCS }),
    );
    expect(html).not.toContain("doc-list-search");
    expect(html).not.toContain(`placeholder="搜索文档"`);
  });

  it("每条都带可搜索文本，供页头搜索落地时过滤", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      {},
      docsCtx({ docs: DOCS }),
    );
    expect(html).toContain(
      `data-doc-search="安装 install 五分钟装好 intro 入门"`,
    );
  });

  it("?q= 在 SSR 侧过滤列表并画出筛选条", () => {
    const html = render(
      SITE_DOCS_LIST_SECTION_TYPE,
      { group_by: "none" },
      docsCtx({ docs: DOCS, query: "模块" }),
    );
    expect(html).toContain("doc-list-filter");
    expect(html).toContain(docPath("modules"));
    expect(html).not.toContain(docPath("install"));
  });
});

describe("site-docs.nav", () => {
  it("当前这一篇标 aria-current", () => {
    const html = render(
      SITE_DOCS_NAV_SECTION_TYPE,
      {},
      docsCtx({ docs: DOCS, currentPath: docPath("modules") }),
    );
    expect(html).toMatch(
      new RegExp(`href="${docPath("modules")}" aria-current="page"`, "u"),
    );
    expect(html).not.toMatch(
      new RegExp(`href="${docPath("install")}" aria-current`, "u"),
    );
  });

  it("没有文档时整段不输出", () => {
    expect(render(SITE_DOCS_NAV_SECTION_TYPE, {}, docsCtx({ docs: [] }))).toBe(
      "",
    );
  });

  it("只有一个分类时不画分类抬头", () => {
    const html = render(
      SITE_DOCS_NAV_SECTION_TYPE,
      {},
      docsCtx({ docs: [DOCS[0]!] }),
    );
    expect(html).toContain(docPath("install"));
    expect(html).not.toContain("doc-nav-group-title");
  });

  it("没填分类的条目列在顶层，不编一个分类名出来", () => {
    const html = render(
      SITE_DOCS_NAV_SECTION_TYPE,
      {},
      docsCtx({ docs: [...DOCS, LOOSE] }),
    );
    expect(html).toContain(docPath("changelog"));
    expect(html).not.toContain("其它");
    expect(html.match(/doc-nav-group-title/gu)?.length).toBe(2);
  });
});

describe("site-docs.article", () => {
  it("上下文里没有当前文档时不输出", () => {
    expect(
      render(SITE_DOCS_ARTICLE_SECTION_TYPE, {}, docsCtx({ docs: DOCS })),
    ).toBe("");
  });

  it("渲染标题、元信息与正文", () => {
    const html = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      {},
      docsCtx({ doc: DOC }),
    );
    expect(html).toContain("<h1>安装</h1>");
    expect(html).toContain("入门");
    expect(html).toContain("更新于");
    expect(html).toContain('<div class="prose">');
  });

  it("开关关掉后对应部件不出现", () => {
    const html = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      {
        show_title: false,
        show_category: false,
        show_updated: false,
        show_back: false,
      },
      docsCtx({ doc: DOC }),
    );
    expect(html).not.toContain("<h1>");
    expect(html).not.toContain("doc-article-meta");
    expect(html).not.toContain("doc-article-back");
  });

  it("元信息两项可以各开各的", () => {
    const html = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      { show_category: false },
      docsCtx({ doc: DOC }),
    );
    expect(html).toContain("doc-article-meta");
    expect(html).not.toContain("doc-tag");
    expect(html).toContain("更新于");
  });

  it("元信息可以移到标题下方", () => {
    const html = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      { meta_position: "below" },
      docsCtx({ doc: DOC }),
    );
    expect(html.indexOf("doc-article-meta")).toBeGreaterThan(
      html.indexOf("<h1>"),
    );
  });

  it("返回链接的文案与目标可以自定义", () => {
    const html = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      { back_label: "回到帮助中心", back_href: "/help" },
      docsCtx({ doc: DOC }),
    );
    expect(html).toContain('href="/help"');
    expect(html).toContain("回到帮助中心");
    expect(html).not.toContain("返回文档");
  });

  it("自定义站内目标补当前语言前缀，外链原样", () => {
    const zh = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      { back_href: "/help" },
      docsCtx({ doc: DOC, locale: "en", defaultLocale: "zh-CN" }),
    );
    expect(zh).toContain('href="/en/help"');

    const external = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      { back_href: "https://example.com/help" },
      docsCtx({ doc: DOC, locale: "en", defaultLocale: "zh-CN" }),
    );
    expect(external).toContain('href="https://example.com/help"');
  });
});

describe("site-docs.toc", () => {
  it("锚点与正文里真正发出来的 heading id 一致", () => {
    const toc = render(
      SITE_DOCS_TOC_SECTION_TYPE,
      {},
      docsCtx({ doc: DOC }),
    );
    const article = render(
      SITE_DOCS_ARTICLE_SECTION_TYPE,
      {},
      docsCtx({ doc: DOC }),
    );
    expect(toc).toContain('href="#准备"');
    expect(article).toContain('id="准备"');
  });

  it("depth=2 时不列三级标题", () => {
    const html = render(
      SITE_DOCS_TOC_SECTION_TYPE,
      { depth: "2" },
      docsCtx({ doc: DOC }),
    );
    expect(html).toContain("准备");
    expect(html).not.toContain("依赖");
  });

  it("正文没有小标题时不输出", () => {
    expect(
      render(
        SITE_DOCS_TOC_SECTION_TYPE,
        {},
        docsCtx({ doc: { ...DOC, body_md: "只有正文" } }),
      ),
    ).toBe("");
  });
});

describe("内置兜底版式", () => {
  const t = (key: string): string => key;

  it("索引页默认列出文档", () => {
    const html = buildDocsTemplateSections(DOCS_INDEX_PAGE_KIND, t)
      .map((item) =>
        renderSectionHtml(item, 0, docsCtx({ docs: DOCS })),
      )
      .join("");
    expect(html).toContain(docPath("install"));
  });

  it("详情页默认三栏：目录 + 正文 + 章节导航", () => {
    const html = buildDocsTemplateSections(DOCS_ARTICLE_PAGE_KIND, t)
      .map((item) =>
        renderSectionHtml(
          item,
          0,
          docsCtx({
            docs: DOCS,
            doc: DOC,
            currentPath: docPath(DOC.slug),
          }),
        ),
      )
      .join("");
    expect(html).toContain("doc-nav");
    expect(html).toContain("doc-article");
    expect(html).toContain("doc-toc");
    expect(html.match(/grp-col(?!-)/gu)?.length).toBe(3);
  });
});
