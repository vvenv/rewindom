import { describe, expect, it } from "vitest";

import {
  createSection,
  getSectionDefinition,
  parseSettingValues,
  type SiteSection,
} from "../../section-schema.js";

import { renderHeaderHtml } from "./html.js";

import type { AppLocale } from "@be-water/shared";

function header(settings: Record<string, unknown>): SiteSection {
  const section = createSection("header");
  return {
    ...section,
    settings: parseSettingValues(getSectionDefinition("header").settings, {
      ...section.settings,
      ...settings,
    }),
  };
}

function renderHeader(locale?: AppLocale): string {
  return renderHeaderHtml({
    section: header({ show_theme_toggle: true }),
    siteName: "站点",
    logoUrl: null,
    homeHref: "/",
    locales: [],
    locale,
  });
}

describe("renderHeaderHtml 明暗按钮", () => {
  it("按页面语言渲染 title", () => {
    expect(renderHeader("zh-CN")).toContain('title="当前主题: 跟随系统"');
    expect(renderHeader("en")).toContain('title="Theme: System"');
  });

  // 预览等场景不传 locale，别把 title 渲染成 undefined
  it("没有 locale 时回落到中文", () => {
    expect(renderHeader()).toContain('title="当前主题: 跟随系统"');
  });
});

describe("renderHeaderHtml 文档搜索入口", () => {
  const DOCS = [
    {
      slug: "intro",
      title: "介绍",
      description: "",
      category: "",
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  function renderSearch(
    settings: Record<string, unknown>,
    input: { docs?: typeof DOCS; locale?: AppLocale; defaultLocale?: AppLocale } = {},
  ): string {
    return renderHeaderHtml({
      section: header(settings),
      siteName: "站点",
      logoUrl: null,
      homeHref: "/",
      locales: [],
      ...input,
    });
  }

  it("开关关着时不渲染", () => {
    expect(
      renderSearch({ show_doc_search: false }, { docs: DOCS }),
    ).not.toContain("header-search");
  });

  // 它是文档搜索的唯一入口（段内那个框已删），默认关等于默认没有搜索
  it("默认就开着", () => {
    expect(renderSearch({}, { docs: DOCS })).toContain("header-search");
  });

  // 没有 JS 也要能用：它就是一个 GET 表单，文档索引那边认 `?q=`
  it("开着且有文档时渲染一个提交到文档索引的 GET 表单", () => {
    const html = renderSearch({ show_doc_search: true }, { docs: DOCS });
    expect(html).toContain('<form class="header-search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('action="/docs"');
    expect(html).toContain('name="q"');
  });

  /*
   * 一篇已发布文档都没有时不渲染：搜不出任何东西的搜索框比没有更糟，
   * 新站点的页头也会平白多出一格。
   */
  it("一篇文档都没有时不渲染", () => {
    expect(
      renderSearch({ show_doc_search: true }, { docs: [] }),
    ).not.toContain("header-search");
    expect(renderSearch({ show_doc_search: true })).not.toContain(
      "header-search",
    );
  });

  /*
   * `hasDocs` 独立于 `docs`：普通页面不查全库目录，只带一个布尔值过来。
   * 认不出它的话，搜索框就只在文档页出现——同一个站点两副页头。
   */
  it("只给 hasDocs、不给 docs 时照样渲染", () => {
    expect(
      renderHeaderHtml({
        section: header({ show_doc_search: true }),
        siteName: "站点",
        logoUrl: null,
        homeHref: "/",
        locales: [],
        hasDocs: true,
      }),
    ).toContain("header-search");
  });

  it("非默认语言下 action 带 locale 前缀，占位文案跟着走", () => {
    const html = renderSearch(
      { show_doc_search: true },
      { docs: DOCS, locale: "en", defaultLocale: "zh-CN" },
    );
    expect(html).toContain('action="/en/docs"');
    expect(html).toContain('placeholder="Search docs"');
  });
});

/*
 * 文档下拉里「分类」和「文档」是两层，必须画得出层次来。
 *
 * 曾经是并排的兄弟节点、同一个左边距，只有字号差一点——一个分类多的文档库在下拉里
 * 就是一串分不出层次的文字，读的人得先猜哪一条是分类名。现在整组套一层
 * `.nav-menu-section`，CSS 才有地方把组内链接缩进去。
 */
describe("renderHeaderHtml 文档下拉的层级", () => {
  const DOCS = [
    {
      slug: "start",
      title: "快速开始",
      description: "",
      category: "入门",
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      slug: "deploy",
      title: "部署",
      description: "",
      category: "运维",
      sort_order: 0,
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];

  function renderDocsMenu(docs = DOCS): string {
    return renderHeaderHtml({
      section: header({}),
      siteName: "站点",
      logoUrl: null,
      homeHref: "/",
      locales: [],
      menus: [
        {
          key: "main",
          title: "",
          items: [
            {
              id: "docs",
              source: "docs",
              label: "文档",
              href: "",
              category: "",
              expand: "children",
              children: [],
            },
          ],
        },
      ],
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
    // 两个分类 = 两组，不是把小标题和链接平铺在面板里
    expect(html.match(/nav-menu-section/gu)).toHaveLength(2);
  });

  /* 只有一个分类时不套这层壳（见 `resolveItem`），下拉里就是一列文档 */
  it("只有一个分类时不画分组", () => {
    const html = renderDocsMenu([DOCS[0]!]);
    expect(html).not.toContain("nav-menu-section");
    expect(html).toContain("快速开始");
  });
});
