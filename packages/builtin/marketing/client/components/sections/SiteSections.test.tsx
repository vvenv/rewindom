import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import {
  parseSections,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { type PublicSitePage } from "../../../shared/site-cms.js";

import { SiteSections } from "./SiteSections.js";

const pages = [
  {
    slug: "docs",
    locale: "zh-CN",
    kind: "page",
    title: "文档",
    description: "",
    path: "/docs",
    settings: {},
  },
  {
    slug: "docs/quickstart",
    locale: "zh-CN",
    kind: "page",
    title: "快速开始",
    description: "",
    path: "/docs/quickstart",
    settings: {},
  },
  {
    slug: "docs/api",
    locale: "zh-CN",
    kind: "page",
    title: "API",
    description: "",
    path: "/docs/api",
    settings: {},
  },
] as unknown as PublicSitePage[];

/** 文档版式：1:3 容器段，左列同级菜单（吸顶）、右列正文。 */
function docsGroup(): SiteSection[] {
  return parseSections([
    {
      type: "group",
      settings: { columns_layout: "1:3", column_gap: 40 },
      blocks: [
        {
          type: "column",
          settings: { sticky: true },
          sections: [
            {
              type: "page-menu",
              settings: { source: "siblings", style: "list" },
            },
          ],
        },
        {
          type: "column",
          settings: {},
          // 列里的「通栏」没有意义，应当被降级
          sections: [
            { type: "prose", settings: { body_md: "正文", width: "full" } },
          ],
        },
      ],
    },
  ]);
}

function renderSections(sections: SiteSection[]) {
  return render(
    <MemoryRouter initialEntries={["/docs/quickstart"]}>
      <SiteSections
        sections={sections}
        pages={pages}
        currentPath="/docs/quickstart"
      />
    </MemoryRouter>,
  );
}

describe("SiteSections 容器段", () => {
  it("按比例分栏，左列吸顶，右列拿到剩下的宽度", () => {
    const { container } = renderSections(docsGroup());
    const columns = container.querySelectorAll(".grp > .grp-col");
    expect(columns).toHaveLength(2);
    expect(columns[0]!.className).toContain("grp-span-3");
    expect(columns[0]!.className).toContain("grp-sticky");
    expect(columns[1]!.className).toContain("grp-span-9");
    expect(columns[1]!.className).not.toContain("grp-sticky");
    // 吸顶列包一层，粘的是内层——列本身拉满行高，右侧分隔线才是整行长
    expect(columns[0]!.querySelector(":scope > .grp-col-inner")).not.toBeNull();
    expect(columns[1]!.querySelector(":scope > .grp-col-inner")).toBeNull();
  });

  it("分隔线的线型 / 线宽 / 颜色落成列上的 CSS 变量（与 SSR 同构）", () => {
    const sections = parseSections([
      {
        type: "group",
        settings: { columns_layout: "1:3" },
        blocks: [
          {
            type: "column",
            settings: {
              show_divider: true,
              divider_style: "dashed",
              divider_width: 2,
              divider_color: "#0f766e",
            },
            sections: [{ type: "prose", settings: { body_md: "左" } }],
          },
          {
            type: "column",
            settings: { show_divider: true },
            sections: [{ type: "prose", settings: { body_md: "右" } }],
          },
        ],
      },
    ]);
    const { container } = renderSections(sections);
    const columns = container.querySelectorAll<HTMLElement>(".grp > .grp-col");
    expect(columns[0]!.className).toContain("grp-col-divider");
    expect(columns[0]!.getAttribute("style")).toBe(
      "--grp-divider-style: dashed; --grp-divider-w: 2px; --grp-divider-color: #0f766e;",
    );
    // 默认线型：开了线但不需要任何变量
    expect(columns[1]!.className).toContain("grp-col-divider");
    expect(columns[1]!.getAttribute("style")).toBeNull();
  });

  it("列里的同级菜单是真链接，当前页标出来", () => {
    renderSections(docsGroup());
    expect(screen.getByRole("link", { name: "API" })).toHaveAttribute(
      "href",
      "/docs/api",
    );
    expect(screen.getByRole("listitem", { current: "page" })).toHaveTextContent(
      "快速开始",
    );
  });

  // 列已经限过宽、给过 gutter，子段不该再自带一层
  it("列里的子段走 contained：不再自带 gutter，full 退化成 page", () => {
    const { container } = renderSections(docsGroup());
    const nested = [...container.querySelectorAll(".grp-col section")];
    expect(nested).toHaveLength(2);
    for (const section of nested) {
      expect(section.querySelector(".sec-c-contained")).toBeTruthy();
      expect(section.firstElementChild!.className).toContain("sec-w-page");
    }
  });

  it("没有列时整段不渲染", () => {
    const { container } = renderSections(
      parseSections([{ type: "group", settings: {}, blocks: [] }]),
    );
    expect(container.querySelector(".grp")).toBeNull();
  });
});

/*
 * 页面标题以前是**自动**渲染的（非首页 + 首段不是 hero 就出 h1），标题出不出现
 * 取决于第一段碰巧是什么类型，租户在树上看不见也删不掉。现在它是一段普通 section。
 */
describe("页面标题段", () => {
  it("文案留空时回落到页面自己的标题与描述", () => {
    renderSections(parseSections([{ type: "page-header", settings: {} }]));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "快速开始",
    );
  });

  it("段上填了就盖过页面标题", () => {
    renderSections(
      parseSections([
        {
          type: "page-header",
          settings: { headline: "上手指南", subhead: "五分钟跑起来" },
        },
      ]),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "上手指南",
    );
    expect(screen.getByText("五分钟跑起来")).toBeTruthy();
  });

  // 不加这一段就没有 h1——标题不再凭第一段的类型自动冒出来
  it("没有这一段就不出 h1", () => {
    renderSections(
      parseSections([{ type: "prose", settings: { body_md: "正文" } }]),
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });
});

/**
 * 预览里的选中：点在块上选块，点在段的空白处选段本身。
 *
 * 编辑器右侧表单与预览高亮都靠这一对返回值决定画什么，所以两种落点都要钉住。
 */
describe("SiteSections 选中", () => {
  function heroWithStats(): SiteSection[] {
    return parseSections([
      {
        type: "hero",
        settings: { headline: "核心能力", subhead: "" },
        blocks: [
          { type: "stat", settings: { term: "第一项", detail: "" } },
          { type: "stat", settings: { term: "第二项", detail: "" } },
        ],
      },
    ]);
  }

  function renderSelectable(sections: SiteSection[], currentPath = "/") {
    const onSelectSection = vi.fn();
    render(
      <MemoryRouter>
        <SiteSections
          sections={sections}
          pages={pages}
          currentPath={currentPath}
          onSelectSection={onSelectSection}
        />
      </MemoryRouter>,
    );
    return { onSelectSection, sections };
  }

  it("点在块上带回 blockId", () => {
    const sections = heroWithStats();
    const { onSelectSection } = renderSelectable(sections);
    const section = sections[0]!;

    fireEvent.click(screen.getByText("第二项"));

    expect(onSelectSection).toHaveBeenCalledWith(
      section.id,
      section.blocks[1]!.id,
    );
  });

  it("点在段的抬头上只选中段", () => {
    const sections = heroWithStats();
    const { onSelectSection } = renderSelectable(sections);

    fireEvent.click(screen.getByText("核心能力"));

    expect(onSelectSection).toHaveBeenCalledWith(sections[0]!.id, null);
  });

  it("分栏段里点子段：选中的是子段，不是外层容器的列", () => {
    const sections = docsGroup();
    const { onSelectSection } = renderSelectable(sections, "/docs/quickstart");
    const group = sections[0]!;
    const inner = group.blocks[0]!.sections![0]!;

    fireEvent.click(screen.getByRole("link", { name: "API" }));

    // 子段自己 stopPropagation，外层 group 不会再收到这次点击
    expect(onSelectSection).toHaveBeenCalledTimes(1);
    expect(onSelectSection).toHaveBeenCalledWith(inner.id, null);
  });
});
