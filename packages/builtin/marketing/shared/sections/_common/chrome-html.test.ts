import { describe, expect, it } from "vitest";

import {
  createBlock,
  createSection,
  localizeSections,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../../section-schema.js";
import { renderFooterHtml } from "../footer/html.js";
import { renderHeaderHtml } from "../header/html.js";

const LINK_ITEMS = [
  {
    id: "pricing",
    source: "link",
    label: "定价",
    href: "/pricing",
    category: "",
    expand: "children",
    children: [],
  },
];

const LOCALES = [
  { locale: "zh-CN", path: "/", label: "简体中文", current: true },
  { locale: "en", path: "/en", label: "English", current: false },
];

function block(type: string, settings: SettingValues = {}): SiteBlock {
  return createBlock("header", type, settings);
}

function section(
  type: "header" | "footer",
  blocks: SiteBlock[],
  settings: SettingValues = {},
): SiteSection {
  const base = createSection(type);
  return { ...base, settings: { ...base.settings, ...settings }, blocks };
}

function localized(
  type: "header" | "footer",
  blocks: SiteBlock[],
  settings: SettingValues = {},
): SiteSection {
  const [next] = localizeSections(
    [section(type, blocks, settings)],
    "zh-CN",
    "zh-CN",
  );
  return next!;
}

function header(blocks: SiteBlock[], settings: SettingValues = {}) {
  return renderHeaderHtml({
    section: localized("header", blocks, settings),
    siteName: "站点",
    logoUrl: null,
    homeHref: "/",
    locales: LOCALES,
    locale: "zh-CN",
  });
}

function footer(blocks: SiteBlock[], settings: SettingValues = {}) {
  return renderFooterHtml({
    section: localized("footer", blocks, settings),
    siteName: "站点",
    logoUrl: null,
    locales: LOCALES,
    locale: "zh-CN",
  });
}

describe("chrome 定位", () => {
  /*
   * 核心：位置由块自己的 row / align 决定。以前由 type 决定（按钮永远靠右），
   * 于是每来一种排法就得多一个「版式」枚举值。
   */
  it("块按 row / align 落位，不看 type", () => {
    const html = header([
      block("chrome_button", { label: "开始", href: "/s", align: "start" }),
      block("chrome_nav", { items: LINK_ITEMS, align: "center" }),
      block("chrome_text", { text: "公告", row: "2", align: "end" }),
    ]);

    const [row1, row2] = html.split('class="wrap chrome-row chrome-row-2"');
    expect(row1).toContain('chrome-zone chrome-zone-start');
    expect(row1).toContain('class="btn" href="/s"');
    expect(row1).toContain("chrome-zone-center");
    expect(row2).toContain("chrome-zone-end");
    expect(row2).toContain("公告");
  });

  it("空行不渲染", () => {
    const html = header([block("chrome_brand", { row: "3" })]);
    expect(html).toContain("chrome-row-3");
    expect(html).not.toContain("chrome-row-1");
    expect(html).not.toContain("chrome-row-2");
  });

  it("每个块自带 data-block-id（编辑器点选的锚点）", () => {
    const html = header([block("chrome_brand", {})]);
    expect(html).toMatch(/<div class="chrome-block" data-block-id="[^"]+">/u);
  });
});

describe("chrome 窄屏", () => {
  /* 一份 DOM 走到底：桌面上 `.chrome-drawer` 是 display:contents，等于不存在 */
  it("收进菜单的块包一层 drawer，并且这一行长出汉堡", () => {
    const html = header([
      block("chrome_nav", { items: LINK_ITEMS, mobile: "menu" }),
    ]);
    expect(html).toContain('<div class="chrome-drawer">');
    expect(html).toContain('class="chrome-menu-toggle"');
    // 同一批链接不许出现两次（旧实现把导航复制了一份进 .header-mobile-nav）
    expect(html.match(/href="\/pricing"/gu)).toHaveLength(1);
  });

  it("没有「收进菜单」的块就没有汉堡", () => {
    const html = header([block("chrome_brand", { mobile: "pin" })]);
    expect(html).not.toContain("chrome-menu-toggle");
  });

  it("窄屏隐藏的块带 chrome-mobile-hide", () => {
    const html = header([block("chrome_text", { mobile: "hide" })]);
    expect(html).toContain("chrome-block chrome-mobile-hide");
  });
});

describe("chrome 导航", () => {
  it("同一个块能横排也能竖列", () => {
    expect(header([block("chrome_nav", { items: LINK_ITEMS })])).toContain(
      "chrome-nav chrome-nav-inline",
    );
    const column = footer([
      block("chrome_nav", { items: LINK_ITEMS, display: "column", title: "产品" }),
    ]);
    expect(column).toContain("chrome-nav chrome-nav-column");
    expect(column).toContain("<h2>产品</h2>");
    expect(column).toContain("<li><a href=\"/pricing\">定价</a></li>");
  });

  it("第一条导航叫主导航，没标题的其余导航不当 landmark", () => {
    const html = header([
      block("chrome_nav", { items: LINK_ITEMS }),
      block("chrome_nav", { items: LINK_ITEMS, row: "2" }),
    ]);
    expect(html).toContain('aria-label="主导航"');
    expect(html).toContain('<div class="chrome-nav chrome-nav-inline">');
  });

  it("展开不出条目的导航不渲染", () => {
    expect(header([block("chrome_nav", { items: [] })])).not.toContain(
      "chrome-nav",
    );
  });
});

describe("chrome 文本占位符", () => {
  it("{year} 与 {site} 在渲染期解析", () => {
    const html = footer([block("chrome_text", { text: "© {year} {site}" })]);
    expect(html).toContain(`© ${new Date().getFullYear()} 站点`);
  });

  it("空文本不留空标签", () => {
    expect(footer([block("chrome_text", { text: "" })])).not.toContain(
      "chrome-text",
    );
  });
});

describe("chrome 外壳", () => {
  it("页头吸顶与分隔线", () => {
    expect(header([block("chrome_brand", {})], { sticky: true })).toContain(
      'class="site-header has-divider sticky"',
    );
    expect(
      header([block("chrome_brand", {})], { sticky: false, show_divider: false }),
    ).toContain('class="site-header"');
  });

  it("留白灌进 CSS 变量，与配色共存", () => {
    const html = footer([block("chrome_text", {})], {
      padding_top: 64,
      spacing_above: 0,
      bg_color: "#101014",
    });
    expect(html).toContain("background-color:#101014");
    expect(html).toContain("--chrome-pt:64px");
    expect(html).toContain("--chrome-mt:0px");
  });
});

describe("chrome 页头页脚同构", () => {
  /*
   * 同一批块摆在页头和页脚，除了外层元素与外壳 class，产出必须逐字节一样——
   * 这正是「一个渲染器」的意义；两份实现的时候，页脚的下拉、搜索、会员入口都各缺
   * 一块，而缺哪一块要摆出特定组合才看得出来。
   */
  it("同一批块在两个区域画出同一份内容", () => {
    // 同一个 section 对象喂给两个渲染器：块 id 与汉堡的 id 才可比
    const [shared] = localizeSections(
      [
        section("header", [
          block("chrome_brand", { blurb: "简介" }),
          block("chrome_nav", { items: LINK_ITEMS, title: "产品" }),
          block("chrome_locale", {}),
          block("chrome_theme", {}),
          block("chrome_button", { label: "开始", href: "/s" }),
          block("chrome_text", { text: "© {year} {site}", row: "2" }),
        ]),
      ],
      "zh-CN",
      "zh-CN",
    );
    const common = {
      section: shared!,
      siteName: "站点",
      logoUrl: null,
      locales: LOCALES,
      locale: "zh-CN" as const,
    };
    const inner = (html: string) =>
      html.slice(html.indexOf(">") + 1, html.lastIndexOf("</"));

    expect(inner(renderHeaderHtml({ ...common, homeHref: "/" }))).toBe(
      inner(renderFooterHtml({ ...common, homeHref: "/" })),
    );
  });
});
