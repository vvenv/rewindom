import { describe, expect, it } from "vitest";

import {
  createSection,
  parseSections,
  type SiteSection,
} from "../shared/section-schema.js";

import { renderSectionHtml } from "./ssr-sections.js";

function hero(settings: Record<string, unknown>): SiteSection {
  const section = createSection("hero");
  section.settings = {
    ...section.settings,
    headline: "Hi",
    ...settings,
  } as never;
  return section;
}

describe("renderSectionHtml", () => {
  // SSR 一度完全没渲染光晕：SEO 首屏没有、水合后突然冒出来
  it("renders the glow only when the setting is on", () => {
    expect(renderSectionHtml(hero({ show_glow: true }))).toContain("sec-glow");
    expect(renderSectionHtml(hero({ show_glow: false }))).not.toContain(
      "sec-glow",
    );
  });

  // 光晕要顶到 section 容器上沿（含上留白），所以画在色块层、不在正文里
  it("puts the glow on the band so it covers the section padding", () => {
    const html = renderSectionHtml(hero({ show_glow: true }));
    expect(html).toMatch(
      /class="sec-band[^"]*has-glow[^"]*"[^>]*>\s*<div class="sec-glow"/u,
    );
    // 正文盒子仍在光晕之后，不被它盖住
    expect(html.indexOf("sec-glow")).toBeLessThan(html.indexOf("sec-content"));
  });

  it("puts the two width axes on the band and the content", () => {
    const html = renderSectionHtml(
      hero({ width: "full", content_width: "narrow" }),
    );
    expect(html).toContain("sec-w-full");
    expect(html).toContain("sec-c-narrow");
  });

  it("lets a full-bleed band use horizontal padding including 0", () => {
    const section = createSection("band");
    expect(renderSectionHtml(section)).toContain("sec-pad-x");
    expect(renderSectionHtml(section)).toContain("--sec-pl:24px");
    expect(renderSectionHtml(section)).toContain("--sec-pr:24px");

    section.settings = {
      ...section.settings,
      padding_left: 0,
      padding_right: 0,
    } as never;
    const flush = renderSectionHtml(section);
    expect(flush).toContain("sec-pad-x");
    expect(flush).toContain("--sec-pl:0px");
    expect(flush).toContain("--sec-pr:0px");
    expect(flush).toContain("sec-w-full");
    expect(flush).toContain("sec-c-full");
  });

  it("carries the gap for the section above it", () => {
    expect(renderSectionHtml(hero({}), 48)).toContain("--sec-gap:48px");
    expect(renderSectionHtml(hero({}))).toContain("--sec-gap:0px");
  });

  it("skips page-header when show_header is off", () => {
    const section = createSection("page-header");
    section.settings = {
      ...section.settings,
      show_header: false,
    } as never;
    expect(renderSectionHtml(section)).toBe("");
  });
});

describe("容器段（group）", () => {
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
      slug: "docs/a",
      locale: "zh-CN",
      kind: "page",
      title: "A",
      description: "",
      path: "/docs/a",
      settings: {},
    },
    {
      slug: "docs/b",
      locale: "zh-CN",
      kind: "page",
      title: "B",
      description: "",
      path: "/docs/b",
      settings: {},
    },
  ] as never;

  /** 文档版式：1:3 的容器段，左列同级菜单（吸顶）、右列正文。 */
  function docsGroup(): SiteSection {
    const [group] = parseSections([
      {
        type: "group",
        settings: { columns_layout: "3:9" },
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
              { type: "prose", settings: { body_md: "# Hi", width: "full" } },
            ],
          },
        ],
      },
    ]);
    return group!;
  }

  it("按比例渲染 12 栏，并把 sticky 落到列上", () => {
    const html = renderSectionHtml(docsGroup(), 0, {
      pages,
      currentPath: "/docs/a",
    });
    expect(html).toContain('class="grp"');
    expect(html).toContain("grp-span-3");
    expect(html).toContain("grp-span-9");
    expect(html).toContain("grp-sticky");
    expect(html).toContain("--grp-gap:40px");
  });

  /*
   * 吸顶列包一层：粘的是内层，列本身能拉满行高——它右边的分隔线因此也是整行长。
   * 没有这一层的话，「吸顶 + 分隔线」画出来只有菜单那么高的一小截。
   */
  it("吸顶列包一层 grp-col-inner，非吸顶列不包", () => {
    const html = renderSectionHtml(docsGroup(), 0, {
      pages,
      currentPath: "/docs/a",
    });
    expect(html).toContain('grp-sticky"><div class="grp-col-inner">');
    expect(html.match(/grp-col-inner/gu)).toHaveLength(1);
  });

  it("分隔线的线型 / 线宽 / 颜色落成列上的 CSS 变量", () => {
    const [group] = parseSections([
      {
        type: "group",
        settings: { columns_layout: "3:9" },
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
            // 同一段里的另一条线：只开开关，保持默认实线
            type: "column",
            settings: { show_divider: true },
            sections: [{ type: "prose", settings: { body_md: "右" } }],
          },
        ],
      },
    ]);
    const html = renderSectionHtml(group!, 0, {
      pages,
      currentPath: "/docs/a",
    });
    expect(html).toContain(
      'class="grp-col grp-span-3 grp-col-divider" style="--grp-divider-style:dashed;--grp-divider-w:2px;--grp-divider-color:#0f766e"',
    );
    // 默认线型的那一列不该多出一个 style 属性
    expect(html).toContain('class="grp-col grp-span-9 grp-col-divider">');
  });

  it("列里的子段走 contained：full 退化成 page，正文不再自带 gutter", () => {
    const html = renderSectionHtml(docsGroup(), 0, {
      pages,
      currentPath: "/docs/a",
    });
    // 外层容器段自己仍是 page 宽；列里的 prose 声明了 full 也不该通栏
    expect(html).not.toContain("sec-w-full");
    expect(html).toContain("sec-c-contained");
  });

  it("同级菜单在列里渲染成真链接，当前页带 aria-current", () => {
    const html = renderSectionHtml(docsGroup(), 0, {
      pages,
      currentPath: "/docs/a",
    });
    expect(html).toContain('href="/docs/b"');
    expect(html).toMatch(
      /aria-current="page"[^>]*>|<[^>]*aria-current="page"/u,
    );
  });

  it("没有列时不渲染", () => {
    const [empty] = parseSections([
      { type: "group", settings: {}, blocks: [] },
    ]);
    expect(renderSectionHtml(empty!)).toBe("");
  });
});
