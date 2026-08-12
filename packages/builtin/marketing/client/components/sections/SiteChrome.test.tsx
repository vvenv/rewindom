import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  createBlock,
  createSection,
  parseAreaSections,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { siteMemberEntrySlot } from "../../shell/site-member-slots.js";

import { SiteFooter, SiteHeader } from "./SiteChrome.js";

import type { ReactNode } from "react";

function EntryStub(): ReactNode {
  return <span data-testid="member-entry">会员入口</span>;
}

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

function withBlocks(section: SiteSection, blocks: SiteBlock[]): SiteSection {
  return { ...section, blocks: [...section.blocks, ...blocks] };
}

function headerSection(options: {
  navItems?: unknown[];
  blocks?: SiteBlock[];
} = {}): SiteSection {
  let section = createSection("header");
  if (options.navItems) {
    section = withNavItems(section, options.navItems);
  }
  if (options.blocks) {
    section = withBlocks(section, options.blocks);
  }
  return section;
}

const alternates = [
  { locale: "zh-CN" as const, path: "/about" },
  { locale: "en" as const, path: "/en/about" },
];

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

function renderHeader(
  section: SiteSection,
  options: { withSlot?: boolean } = {},
) {
  const header = (
    <SiteHeader
      section={section}
      siteName="Acme"
      logoUrl={null}
      pages={pages}
      alternates={alternates}
      locale="zh-CN"
    />
  );
  return render(
    <MemoryRouter>
      {options.withSlot === false ? (
        header
      ) : (
        <siteMemberEntrySlot.Provider component={EntryStub}>
          {header}
        </siteMemberEntrySlot.Provider>
      )}
    </MemoryRouter>,
  );
}

describe("SiteHeader 默认块", () => {
  /*
   * 语言与明暗随默认页头出厂，理由见 `header/definition.ts`：不预置等于悄悄关掉
   * 一整个功能（翻译发布了没入口、明暗那套存储访客够不着）。内容与能力决策
   * （按钮 / 文档搜索 / 会员入口）仍然不预置。
   */
  it("默认是品牌 + 导航 + 语言 + 明暗，不含按钮 / 搜索 / 会员", () => {
    const section = headerSection();

    expect(section.blocks.map((block) => block.type)).toEqual([
      "chrome_brand",
      "chrome_nav",
      "chrome_locale",
      "chrome_theme",
    ]);

    const navBlock = section.blocks.find((block) => block.type === "chrome_nav");
    expect((navBlock?.settings.items as unknown[]).length).toBeGreaterThan(0);
  });

  it("默认页头就能切语言和明暗", () => {
    renderHeader(headerSection());

    expect(
      screen.getAllByRole("link", { name: "文档" }).length,
    ).toBeGreaterThan(0);
    expect(document.querySelector(".locale-switcher")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /当前主题/u }),
    ).toBeInTheDocument();
    // 会员入口仍要自己加
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  it("只有一种语言时语言切换器不渲染", () => {
    render(
      <MemoryRouter>
        <SiteHeader
          section={headerSection()}
          siteName="Acme"
          logoUrl={null}
          pages={pages}
          alternates={[{ locale: "zh-CN", path: "/about" }]}
          locale="zh-CN"
        />
      </MemoryRouter>,
    );

    expect(document.querySelector(".locale-switcher")).toBeNull();
  });

  it("items 为空时顶栏不列一级页", () => {
    renderHeader(headerSection({ navItems: [] }));
    expect(screen.queryByRole("link", { name: "文档" })).toBeNull();
  });

  it("删掉块就不再渲染", () => {
    const section = headerSection();
    renderHeader({
      ...section,
      blocks: section.blocks.filter(
        (block) => block.type !== "chrome_locale" && block.type !== "chrome_theme",
      ),
    });

    expect(document.querySelector(".locale-switcher")).toBeNull();
    expect(screen.queryByRole("button", { name: /当前主题/u })).toBeNull();
  });
});

describe("SiteHeader 账户入口", () => {
  it("默认不露出会员入口", () => {
    renderHeader(headerSection());
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  it("加上账户 block 后渲染 slot 提供方", () => {
    renderHeader(
      headerSection({
        blocks: [createBlock("header", "chrome_account", {})],
      }),
    );
    expect(screen.getByTestId("member-entry")).toBeInTheDocument();
  });

  it("没有提供方时不留占位", () => {
    const { container } = renderHeader(
      headerSection({
        blocks: [createBlock("header", "chrome_account", {})],
      }),
      { withSlot: false },
    );
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
    expect(container.querySelector("header")).toBeInTheDocument();
  });

  it("没有账户 block 时整块不出现", () => {
    renderHeader(headerSection());
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  it("默认不预设次按钮", () => {
    renderHeader(headerSection());
    expect(screen.queryByRole("link", { name: /登录|Login/u })).toBeNull();
  });

  it("站长自己配的按钮 block 照常渲染", () => {
    renderHeader(
      headerSection({
        blocks: [
          createBlock("header", "chrome_account", {}),
          createBlock("header", "chrome_button", {
            label: "联系我们",
            href: "/contact",
            variant: "ghost",
          }),
        ],
      }),
    );
    expect(screen.getByRole("link", { name: "联系我们" })).toHaveAttribute(
      "href",
      "/contact",
    );
    expect(screen.getByTestId("member-entry")).toBeInTheDocument();
  });
});

describe("SiteHeader 导航的无障碍名字", () => {
  it("页头导航与窄屏导航各有一个名字，不是两个同名 landmark", () => {
    renderHeader(
      headerSection({
        navItems: [
          {
            id: "pricing",
            source: "link",
            label: "定价",
            href: "/pricing",
            category: "",
            expand: "children",
            children: [],
          },
        ],
      }),
    );

    expect(screen.getByRole("navigation", { name: "主导航" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "主导航（移动端）" }),
    ).toBeVisible();
  });
});

describe("SiteFooter 链接列", () => {
  function renderFooter(blocks: SiteBlock[]) {
    return render(
      <MemoryRouter>
        <SiteFooter
          section={{ ...createSection("footer"), blocks }}
          siteName="Acme"
          logoUrl={null}
          pages={pages}
          locale="zh-CN"
        />
      </MemoryRouter>,
    );
  }

  const ITEMS = [
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

  it("有列标题才当 landmark，标题就是它的名字", () => {
    renderFooter([
      createBlock("footer", "menu_column", { title: "产品", items: ITEMS }),
    ]);

    expect(screen.getByRole("navigation", { name: "产品" })).toBeVisible();
  });

  /* 无名 landmark 只会把读屏器的跳转列表撑满，那一列就是一组链接而已 */
  it("没有列标题就不制造无名 landmark", () => {
    renderFooter([createBlock("footer", "menu_column", { items: ITEMS })]);

    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("link", { name: "定价" })).toBeVisible();
  });

  /*
   * 列宽由 `.footer-col` 说了算（按内容宽），有没有列标题只决定它是不是 landmark。
   * 漏了这个类，那一列就退回「等分整行」的老样子——四条短链接摊掉三成宽。
   */
  it("链接列不论有没有标题都带 .footer-col", () => {
    const { container } = renderFooter([
      createBlock("footer", "menu_column", { title: "产品", items: ITEMS }),
      createBlock("footer", "menu_column", { items: ITEMS }),
    ]);

    expect(container.querySelectorAll(".footer-grid > .footer-col")).toHaveLength(
      2,
    );
  });
});

describe("SiteFooter 底栏", () => {
  function renderFooter(blocks: SiteBlock[]) {
    return render(
      <MemoryRouter>
        <SiteFooter
          section={{ ...createSection("footer"), blocks }}
          siteName="Acme"
          logoUrl={null}
          pages={pages}
          locale="zh-CN"
        />
      </MemoryRouter>,
    );
  }

  it("法务链接与版权同处底栏一行", () => {
    const { container } = renderFooter([
      createBlock("footer", "chrome_copyright", {
        text: "© 2026 Acme",
        links: [
          {
            id: "privacy",
            source: "link",
            label: "隐私政策",
            href: "/privacy",
            category: "",
            expand: "children",
            children: [],
          },
        ],
      }),
    ]);

    const legal = container.querySelector(".footer-legal");
    expect(legal?.textContent).toContain("© 2026 Acme");
    expect(
      screen.getByRole("navigation", { name: "法务链接" }),
    ).toBeVisible();
    expect(legal?.querySelector(".footer-legal-links a")?.textContent).toBe(
      "隐私政策",
    );
  });

  /* 底栏是一行文字，塞不下下拉——父项本身不可点，摊平后只留真能点的那几条 */
  it("动态项摊平成并排链接", () => {
    renderFooter([
      createBlock("footer", "chrome_copyright", {
        links: [
          {
            id: "pages",
            source: "pages",
            label: "",
            href: "",
            category: "",
            expand: "children",
            children: [],
          },
        ],
      }),
    ]);

    const nav = screen.getByRole("navigation", { name: "法务链接" });
    expect(nav.querySelectorAll("a").length).toBe(pages.length);
    expect(nav.querySelectorAll("ul, details").length).toBe(0);
  });

  it("没配链接就不制造空的 landmark", () => {
    renderFooter([createBlock("footer", "chrome_copyright", {})]);

    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("parseAreaSections 升级旧版页头", () => {
  it("把 legacy settings 迁成 blocks", () => {
    const [section] = parseAreaSections("header", [
      {
        type: "header",
        settings: { show_account: true, items: [] },
        blocks: [],
      },
    ]);
    expect(section?.blocks.some((block) => block.type === "chrome_account")).toBe(
      true,
    );
  });
});
