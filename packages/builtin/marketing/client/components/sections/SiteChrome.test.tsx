import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  createBlock,
  createSection,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { siteMemberEntrySlot } from "../../shell/site-member-slots.js";

import { SiteChrome } from "./SiteChrome.js";

import type { ReactNode } from "react";

function EntryStub(): ReactNode {
  return <span data-testid="member-entry">会员入口</span>;
}

const pages = [
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

const alternates = [
  { locale: "zh-CN" as const, path: "/", title: "首页" },
  { locale: "en" as const, path: "/en", title: "Home" },
];

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

function area(
  tag: "header" | "footer",
  blocks: SiteBlock[],
  settings: SettingValues = {},
) {
  const base = createSection(tag);
  const section: SiteSection = {
    ...base,
    settings: { ...base.settings, ...settings },
    blocks,
  };
  return render(
    <MemoryRouter>
      <siteMemberEntrySlot.Provider component={EntryStub}>
        <SiteChrome
          tag={tag}
          section={section}
          siteName="Acme"
          logoUrl={null}
          pages={pages}
          alternates={alternates}
          locale="zh-CN"
          defaultLocale="zh-CN"
        />
      </siteMemberEntrySlot.Provider>
    </MemoryRouter>,
  );
}

function block(type: string, settings: SettingValues = {}): SiteBlock {
  return createBlock("header", type, settings);
}

describe("SiteChrome 定位", () => {
  /*
   * 这是整套 chrome 的核心：块落在哪里由**块自己**说了算。以前是 type 说了算
   * （按钮永远靠右、导航永远在中间），于是每来一种排法就得多一个「版式」枚举。
   */
  it("块按自己的 row / align 落位，不看 type", () => {
    const { container } = area("header", [
      block("chrome_brand", { row: "1", align: "start" }),
      // 按钮**靠左**、导航**居中**——旧模型里这两个位置都排不出来
      block("chrome_button", {
        label: "免费开始",
        href: "/signup",
        row: "1",
        align: "start",
      }),
      block("chrome_nav", { items: LINK_ITEMS, row: "1", align: "center" }),
      block("chrome_text", { text: "限时优惠", row: "2", align: "end" }),
    ]);

    const rows = container.querySelectorAll(".chrome-row");
    expect(rows).toHaveLength(2);

    const start = rows[0]!.querySelector(".chrome-zone-start")!;
    expect(start.querySelector(".brand")).not.toBeNull();
    expect(start.querySelector("a.btn")?.textContent).toBe("免费开始");
    expect(rows[0]!.querySelector(".chrome-zone-center .chrome-nav")).not.toBeNull();
    expect(rows[1]!.querySelector(".chrome-zone-end .chrome-text")?.textContent).toBe(
      "限时优惠",
    );
  });

  it("空行不渲染", () => {
    const { container } = area("header", [
      block("chrome_brand", { row: "3" }),
    ]);
    expect(container.querySelectorAll(".chrome-row")).toHaveLength(1);
    expect(container.querySelector(".chrome-row-3")).not.toBeNull();
  });

  /* 一份 DOM 走到底：窄屏收进菜单的块外面套一层，桌面上那层是 display:contents */
  it("窄屏收进菜单的块只出现一次，且有汉堡", () => {
    const { container } = area("header", [
      block("chrome_nav", { items: LINK_ITEMS, mobile: "menu" }),
    ]);

    expect(container.querySelectorAll(".chrome-drawer")).toHaveLength(1);
    expect(container.querySelectorAll(".chrome-menu-toggle")).toHaveLength(1);
    // 同一批链接不许在 DOM 里出现两次（旧的 .header-mobile-nav 就是复制了一份）
    expect(screen.getAllByRole("link", { name: "定价" })).toHaveLength(1);
  });

  it("没有「收进菜单」的块就没有汉堡", () => {
    const { container } = area("header", [
      block("chrome_brand", { mobile: "pin" }),
    ]);
    expect(container.querySelector(".chrome-menu-toggle")).toBeNull();
  });
});

describe("SiteChrome 导航", () => {
  /* 横排与竖列是同一个块的两种排列，不再是两个 type */
  it("同一个导航块能横排也能竖列", () => {
    const inline = area("header", [
      block("chrome_nav", { items: LINK_ITEMS, display: "inline" }),
    ]);
    expect(
      inline.container.querySelector(".chrome-nav-inline"),
    ).not.toBeNull();
    inline.unmount();

    const column = area("footer", [
      block("chrome_nav", { items: LINK_ITEMS, display: "column" }),
    ]);
    expect(
      column.container.querySelector(".chrome-nav-column ul li a"),
    ).not.toBeNull();
  });

  /*
   * 无名 landmark 只会把读屏器的跳转列表撑满：填了标题才当 `<nav>`。
   * 页头**第一个**导航是唯一例外——它天然是「主导航」。
   */
  it("第一条导航叫主导航，其余要自己的标题才当 landmark", () => {
    const { container } = area("header", [
      block("chrome_nav", { items: LINK_ITEMS }),
      block("chrome_nav", { items: LINK_ITEMS, title: "产品" }),
      block("chrome_nav", { items: LINK_ITEMS, row: "2" }),
    ]);

    expect(screen.getByRole("navigation", { name: "主导航" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "产品" })).toBeVisible();
    // 第三条既不是主导航也没有标题：退回 div，不制造无名 landmark
    expect(screen.getAllByRole("navigation")).toHaveLength(2);
    expect(container.querySelectorAll("div.chrome-nav")).toHaveLength(1);
  });

  it("展开不出任何条目的导航不渲染", () => {
    const { container } = area("header", [block("chrome_nav", { items: [] })]);
    expect(container.querySelector(".chrome-nav")).toBeNull();
  });
});

describe("SiteChrome 文本占位符", () => {
  it("{year} 与 {site} 在渲染期解析", () => {
    const { container } = area("footer", [
      block("chrome_text", { text: "© {year} {site}" }),
    ]);
    expect(container.querySelector(".chrome-text")?.textContent).toBe(
      `© ${new Date().getFullYear()} Acme`,
    );
  });

  it("空文本不留空标签", () => {
    const { container } = area("footer", [block("chrome_text", { text: "" })]);
    expect(container.querySelector(".chrome-text")).toBeNull();
  });
});

describe("SiteChrome 区域差异", () => {
  it("页头是 header 元素、能吸顶；页脚是 footer 元素、吃 spacing_above", () => {
    const header = area("header", [block("chrome_brand", {})], {
      sticky: true,
    });
    const headerEl = header.container.querySelector("header")!;
    expect(headerEl.className).toContain("site-header");
    expect(headerEl.className).toContain("sticky");
    header.unmount();

    const footer = area("footer", [block("chrome_text", {})], {
      spacing_above: 80,
      show_divider: false,
    });
    const footerEl = footer.container.querySelector("footer")!;
    expect(footerEl.className).toBe("site-footer");
    expect(footerEl.style.getPropertyValue("--chrome-mt")).toBe("80px");
  });

  it("留白设置灌进 CSS 变量", () => {
    const { container } = area("header", [block("chrome_brand", {})], {
      padding_top: 24,
      padding_bottom: 8,
      row_gap: 4,
    });
    const el = container.querySelector("header")!;
    expect(el.style.getPropertyValue("--chrome-pt")).toBe("24px");
    expect(el.style.getPropertyValue("--chrome-pb")).toBe("8px");
    expect(el.style.getPropertyValue("--chrome-row-gap")).toBe("4px");
  });

  /* 语言 / 明暗 / 会员入口页头页脚都能加——同一张块表 */
  it("语言与会员入口在页脚照样渲染", () => {
    const { container } = area("footer", [
      block("chrome_locale", {}),
      block("chrome_account", {}),
    ]);

    expect(container.querySelector("footer .locale-switcher")).not.toBeNull();
    expect(screen.getByTestId("member-entry")).toBeVisible();
  });

  it("只有一种语言时语言块不渲染", () => {
    const base = createSection("footer");
    const { container } = render(
      <MemoryRouter>
        <SiteChrome
          tag="footer"
          section={{ ...base, blocks: [block("chrome_locale", {})] }}
          siteName="Acme"
          logoUrl={null}
          locale="zh-CN"
          alternates={[alternates[0]!]}
        />
      </MemoryRouter>,
    );
    expect(container.querySelector(".locale-switcher")).toBeNull();
  });
});
