/**
 * 两端渲染的**结构**对齐守卫。
 *
 * `section-parity.test.ts` 只查「两端都有渲染器」，查不出两边长得不一样。而两边长得
 * 不一样恰恰是最容易发生的：改了 SPA 视图的外层包装，忘了改对应的 SSR 字符串——
 * 首屏与水合后结构不同，轻则排版跳一下，重则 React 接管时整片重建。
 *
 * 这里比的是**顶层元素的标签名与 class**：够粗，不会因为 `data-block-id`（只有编辑器
 * 需要）或 style 属性的写法差异误报；也够细，包装层多一层少一层一定会被抓到。
 */

import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  createSection,
  PAGE_SECTION_TYPES,
  type PageSectionType,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { SECTION_HTML } from "../../../shared/sections/html.js";
import type { SectionRenderContext } from "../../../shared/sections/render-context.js";
import type { PublicSitePage } from "../../../shared/site-cms.js";

import { SECTION_VIEWS } from "./section-views.js";

const PAGES = [
  { path: "/", title: "Home", description: "", kind: "home" },
  { path: "/docs", title: "Docs", description: "Guide" },
  { path: "/docs/intro", title: "Intro", description: "" },
] as unknown as PublicSitePage[];

const CURRENT_PATH = "/docs";

/**
 * `doc-*` 段的样本数据：没有它，那几段两端都渲染成空，这条守卫就白站了。
 *
 * 两个分类 + 一篇没填分类：目录与列表的顶层结构正是随这个形状变的（分组的套壳、
 * 散条目不套抬头），一篇一分类的样本会让两端各走各的分支而这条守卫看不出来。
 */
const DOCS = [
  {
    slug: "intro",
    title: "Intro",
    description: "Getting started",
    category: "guide",
    category_label: "Guide",
    sort_order: 0,
    updated_at: "2026-01-02T03:04:05.000Z",
  },
  {
    slug: "api",
    title: "API",
    description: "Reference",
    category: "reference",
    category_label: "Reference",
    sort_order: 1,
    updated_at: "2026-01-03T03:04:05.000Z",
  },
  {
    slug: "changelog",
    title: "Changelog",
    description: "",
    category: "",
    category_label: "",
    sort_order: 2,
    updated_at: "2026-01-04T03:04:05.000Z",
  },
];
const DOC = { ...DOCS[0]!, body_md: "## 章节\n\n正文" };

/** 顶层元素的「标签 + class」——两端唯一必须逐字一致的东西。 */
function shapeOf(nodes: Iterable<Element>): string[] {
  return [...nodes].map(
    (el) => `${el.tagName.toLowerCase()}.${el.className || "-"}`,
  );
}

function ssrShape(section: SiteSection, ctx: SectionRenderContext): string[] {
  const html = SECTION_HTML[section.type]!(section, ctx);
  const host = document.createElement("div");
  host.innerHTML = html;
  return shapeOf(host.children);
}

function spaShape(section: SiteSection): string[] {
  const View = SECTION_VIEWS[section.type]!;
  // 站内链接是 react-router 的 `<Link>`，没有 Router 上下文会直接抛
  const { container } = render(
    <MemoryRouter>
      <View
        section={section}
        pages={PAGES}
        currentPath={CURRENT_PATH}
        docs={DOCS}
        doc={DOC}
        renderChildren={() => null}
      />
    </MemoryRouter>,
  );
  return shapeOf(container.children);
}

/**
 * 每种段的一份能真正渲染出东西的样本。
 *
 * `createSection` 已经带上了 `preset_blocks`，只有几种段还缺「非空才渲染」的那点内容。
 */
function fixture(type: PageSectionType): SiteSection {
  const section = createSection(type);
  if (type === "page-header") {
    section.settings.headline = "标题";
    section.settings.subhead = "副标题";
  }
  if (type === "prose") section.settings.body_md = "正文";
  if (type === "hero") section.settings.headline = "Welcome";
  // 有抬头才看得出 sectionHeading 那一层在不在
  if ("heading" in section.settings) section.settings.heading = "抬头";
  return section;
}

describe("section 两端渲染结构对齐", () => {
  it.each(PAGE_SECTION_TYPES)("%s 顶层结构一致", (type) => {
    const section = fixture(type);
    const ctx: SectionRenderContext = {
      pages: PAGES,
      currentPath: CURRENT_PATH,
      docs: DOCS,
      doc: DOC,
      sectionSpacing: 0,
      // 容器段的子段两端都渲染成空，这里只比 group 自己那一层
      renderSection: () => "",
    };

    expect(ssrShape(section, ctx)).toEqual(spaShape(section));
  });
});
