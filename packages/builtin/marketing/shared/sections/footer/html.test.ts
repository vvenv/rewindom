import { describe, expect, it } from "vitest";

import {
  createBlock,
  createSection,
  type SiteBlock,
} from "../../section-schema.js";

import { renderFooterHtml } from "./html.js";

const LINK_ITEM = {
  id: "privacy",
  source: "link",
  label: "隐私政策",
  href: "/privacy",
  category: "",
  expand: "children",
  children: [],
};

const PAGES = [
  {
    slug: "docs",
    locale: "zh-CN" as const,
    kind: "page" as const,
    title: "文档",
    description: "",
    path: "/docs",
    settings: {},
  },
];

function renderFooter(blocks: SiteBlock[]): string {
  return renderFooterHtml({
    section: { ...createSection("footer"), blocks },
    siteName: "站点",
    logoUrl: null,
    pages: PAGES,
    locale: "zh-CN",
  });
}

describe("renderFooterHtml 链接列", () => {
  /*
   * `.footer-col` 就是「这一列按内容宽」的开关。漏掉它，那一列会退回等分整行的老
   * 样子——两列短链接各摊掉三成宽。SPA 那边有一条同名的测试，两端得一起守。
   */
  it("链接列不论有没有标题都带 .footer-col", () => {
    const html = renderFooter([
      createBlock("footer", "menu_column", { title: "产品", items: [LINK_ITEM] }),
      createBlock("footer", "menu_column", { items: [LINK_ITEM] }),
    ]);

    expect(html).toContain('<nav class="footer-col"');
    expect(html).toContain('<div class="footer-col"');
  });

  it("品牌块带 .footer-brand（它负责吃掉整行剩下的宽度）", () => {
    const html = renderFooter([
      createBlock("footer", "chrome_brand", { show_site_name: true }),
    ]);

    expect(html).toContain('<div class="footer-brand"');
  });
});

describe("renderFooterHtml 底栏", () => {
  it("法务链接与版权同处底栏一行", () => {
    const html = renderFooter([
      createBlock("footer", "chrome_copyright", {
        text: "© 2026 站点",
        links: [LINK_ITEM],
      }),
    ]);

    expect(html).toContain("<span>© 2026 站点</span>");
    expect(html).toContain('<nav class="footer-legal-links" aria-label="法务链接">');
    expect(html).toContain('<a href="/privacy">隐私政策</a>');
  });

  /* 底栏是一行文字，塞不下下拉——动态项摊平，父项那条本身不可点所以不出现 */
  it("动态项摊平成并排链接", () => {
    const html = renderFooter([
      createBlock("footer", "chrome_copyright", {
        links: [
          {
            ...LINK_ITEM,
            id: "pages",
            source: "pages",
            label: "",
            href: "",
          },
        ],
      }),
    ]);

    expect(html).toContain('<a href="/docs">文档</a>');
    expect(html).not.toContain("footer-group");
  });

  it("没配链接就不制造空的 landmark", () => {
    const html = renderFooter([
      createBlock("footer", "chrome_copyright", { text: "© 2026 站点" }),
    ]);

    expect(html).not.toContain("footer-legal-links");
  });
});
