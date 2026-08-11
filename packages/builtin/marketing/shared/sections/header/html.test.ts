import { describe, expect, it } from "vitest";

import {
  createBlock,
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteBlock,
  type SiteSection,
} from "../../section-schema.js";
import { defaultHeaderNavItems } from "../../site-nav.js";

import { renderHeaderHtml } from "./html.js";

import type { AppLocale } from "@be-water/shared";

function withNavItems(section: SiteSection, items: unknown[]): SiteSection {
  return {
    ...section,
    blocks: section.blocks.map((block) =>
      block.type === "chrome_nav"
        ? { ...block, settings: { ...block.settings, items } }
        : block,
    ),
  };
}

function withExtraBlocks(
  section: SiteSection,
  blocks: SiteBlock[],
): SiteSection {
  return { ...section, blocks: [...section.blocks, ...blocks] };
}

function header(settings: Record<string, unknown> = {}): SiteSection {
  const section = createSection("header");
  const parsed = {
    ...section,
    settings: parseSettingValues(getSectionDefinition("header").settings, {
      ...section.settings,
      ...settings,
    }),
  };
  if (settings.items) {
    return withNavItems(parsed, settings.items as unknown[]);
  }
  return parsed;
}

function renderHeader(
  section: SiteSection,
  locale?: AppLocale,
): string {
  return renderHeaderHtml({
    section,
    siteName: "站点",
    logoUrl: null,
    homeHref: "/",
    locales: [],
    locale,
  });
}

describe("renderHeaderHtml 明暗按钮", () => {
  it("按页面语言渲染 title", () => {
    const section = withExtraBlocks(header(), [
      createBlock("header", "chrome_theme", {}),
    ]);
    expect(renderHeader(section, "zh-CN")).toContain(
      'title="当前主题: 跟随系统"',
    );
    expect(renderHeader(section, "en")).toContain('title="Theme: System"');
  });

  it("没有 locale 时回落到中文", () => {
    const section = withExtraBlocks(header(), [
      createBlock("header", "chrome_theme", {}),
    ]);
    expect(renderHeader(section)).toContain('title="当前主题: 跟随系统"');
  });
});

describe("renderHeaderHtml 文档搜索入口", () => {
  const DOCS = [
    {
      slug: "intro",
      title: "介绍",
      description: "",
      category: "",
      category_label: "",
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  function renderSearch(
    section: SiteSection,
    input: { docs?: typeof DOCS; locale?: AppLocale; defaultLocale?: AppLocale } = {},
  ): string {
    return renderHeaderHtml({
      section,
      siteName: "站点",
      logoUrl: null,
      homeHref: "/",
      locales: [],
      ...input,
    });
  }

  it("没有搜索块时不渲染", () => {
    expect(renderSearch(header(), { docs: DOCS })).not.toContain(
      "header-search",
    );
  });

  it("有搜索块且有文档时渲染一个提交到文档索引的 GET 表单", () => {
    const section = withExtraBlocks(header(), [
      createBlock("header", "chrome_doc_search", {}),
    ]);
    const html = renderSearch(section, { docs: DOCS });
    expect(html).toContain('<form class="header-search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/docs"');
    expect(html).toContain('name="q"');
  });

  it("一篇文档都没有时不渲染", () => {
    const section = withExtraBlocks(header(), [
      createBlock("header", "chrome_doc_search", {}),
    ]);
    expect(renderSearch(section, { docs: [] })).not.toContain("header-search");
    expect(renderSearch(section)).not.toContain("header-search");
  });

  it("只给 hasDocs、不给 docs 时照样渲染", () => {
    const section = withExtraBlocks(header(), [
      createBlock("header", "chrome_doc_search", {}),
    ]);
    expect(
      renderHeaderHtml({
        section,
        siteName: "站点",
        logoUrl: null,
        homeHref: "/",
        locales: [],
        hasDocs: true,
      }),
    ).toContain("header-search");
  });

  it("非默认语言下 action 带 locale 前缀，占位文案跟着走", () => {
    const section = withExtraBlocks(header(), [
      createBlock("header", "chrome_doc_search", {}),
    ]);
    const html = renderSearch(section, {
      docs: DOCS,
      locale: "en",
      defaultLocale: "zh-CN",
    });
    expect(html).toContain('action="/en/docs"');
    expect(html).toContain('placeholder="Search docs"');
  });
});

describe("renderHeaderHtml 文档下拉的层级", () => {
  const DOCS = [
    {
      slug: "start",
      title: "快速开始",
      description: "",
      category: "入门",
      category_label: "入门",
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      slug: "deploy",
      title: "部署",
      description: "",
      category: "运维",
      category_label: "运维",
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  function renderDocsMenu(docs = DOCS): string {
    return renderHeaderHtml({
      section: withNavItems(header(), [
        {
          id: "docs",
          source: "docs",
          label: "文档",
          href: "",
          category: "",
          expand: "children",
          children: [],
        },
      ]),
      siteName: "站点",
      logoUrl: null,
      homeHref: "/",
      locales: [],
      docs,
    });
  }

  it("每个分类连同它的文档裹在一层里", () => {
    const html = renderDocsMenu();
    expect(html).toContain(
      '<div class="nav-menu-section"><p class="nav-menu-group">入门</p><a',
    );
    expect(html).toContain(
      '<div class="nav-menu-section"><p class="nav-menu-group">运维</p><a',
    );
    expect(html.match(/nav-menu-section/gu)).toHaveLength(2);
  });

  it("只有一个分类时不画分组", () => {
    const html = renderDocsMenu([DOCS[0]!]);
    expect(html).not.toContain("nav-menu-section");
    expect(html).toContain("快速开始");
  });
});
