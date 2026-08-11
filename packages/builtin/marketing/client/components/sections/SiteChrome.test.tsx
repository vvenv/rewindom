import { cleanup, render, screen } from "@testing-library/react";
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

describe("SiteHeader 显示项开关", () => {
  it("默认带导航条目，语言/明暗/账户要加对应 block 才出现", () => {
    const section = headerSection();
    const navBlock = section.blocks.find((block) => block.type === "chrome_nav");
    expect(Array.isArray(navBlock?.settings.items)).toBe(true);
    expect((navBlock?.settings.items as unknown[]).length).toBeGreaterThan(0);
    expect(
      section.blocks.some((block) => block.type === "chrome_locale"),
    ).toBe(false);
    expect(
      section.blocks.some((block) => block.type === "chrome_theme"),
    ).toBe(false);
    expect(
      section.blocks.some((block) => block.type === "chrome_doc_search"),
    ).toBe(false);
    expect(
      section.blocks.some((block) => block.type === "chrome_account"),
    ).toBe(false);

    renderHeader(section);
    expect(
      screen.getAllByRole("link", { name: "文档" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("navigation", { name: "Language" })).toBeNull();
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  it("items 为空时顶栏不列一级页", () => {
    renderHeader(headerSection({ navItems: [] }));
    expect(screen.queryByRole("link", { name: "文档" })).toBeNull();
  });

  it("语言切换按 block 出现", () => {
    renderHeader(
      headerSection({
        blocks: [createBlock("header", "chrome_locale", {})],
      }),
    );
    expect(document.querySelector(".locale-switcher")).toBeInTheDocument();
  });

  it("深色模式切换按 block 出现", () => {
    renderHeader(headerSection());
    expect(screen.queryByRole("button", { name: /当前主题/u })).toBeNull();

    cleanup();
    renderHeader(
      headerSection({
        blocks: [createBlock("header", "chrome_theme", {})],
      }),
    );
    expect(
      screen.getByRole("button", { name: /当前主题/u }),
    ).toBeInTheDocument();
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
