import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import {
  parseAreaSections,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { siteMemberEntrySlot } from "../../shell/site-member-slots.js";

import { SiteHeader } from "./SiteChrome.js";

import type { ReactNode } from "react";

/** 站点前台由 site-member 填进来的那一枚；这里用个替身，只验它有没有被渲染。 */
function EntryStub(): ReactNode {
  return <span data-testid="member-entry">会员入口</span>;
}

function headerSection(settings: Record<string, unknown> = {}): SiteSection {
  const [section] = parseAreaSections("header", [
    { type: "header", settings, blocks: [] },
  ]);
  return section!;
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
  /*
   * 四项是同一类决定（这枚入口露不露），所以并排摆在页头里。能力本身另有出处：
   * 语言看有没有译文、明暗永远跟随设备、账户看租户有没有开通会员。
   */
  it("默认带导航条目，语言/明暗/账户要显式打开", () => {
    const settings = headerSection().settings;
    expect(Array.isArray(settings.items)).toBe(true);
    expect((settings.items as unknown[]).length).toBeGreaterThan(0);
    expect(settings.show_locale_switcher).toBe(false);
    expect(settings.show_theme_toggle).toBe(false);
    expect(settings.show_doc_search).toBe(false);
    expect(settings.show_account).toBe(false);

    renderHeader(headerSection());
    expect(
      screen.getAllByRole("link", { name: "文档" }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("navigation", { name: "Language" })).toBeNull();
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  it("items 为空时顶栏不列一级页", () => {
    renderHeader(headerSection({ items: [] }));
    expect(screen.queryByRole("link", { name: "文档" })).toBeNull();
  });

  it("语言切换按开关出现", () => {
    renderHeader(headerSection({ show_locale_switcher: true }));
    expect(document.querySelector(".locale-switcher")).toBeInTheDocument();
  });

  // ThemeToggle 没有可见文案，可读名字来自 title（「当前主题: 跟随系统」）
  it("深色模式切换按开关出现", () => {
    renderHeader(headerSection());
    expect(screen.queryByRole("button", { name: /当前主题/u })).toBeNull();

    cleanup();
    renderHeader(headerSection({ show_theme_toggle: true }));
    expect(
      screen.getByRole("button", { name: /当前主题/u }),
    ).toBeInTheDocument();
  });
});

describe("SiteHeader 账户入口", () => {
  it("默认不露出会员入口", () => {
    expect(headerSection().settings.show_account).toBe(false);
    renderHeader(headerSection());
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  it("打开开关后渲染 slot 提供方", () => {
    expect(headerSection({ show_account: true }).settings.show_account).toBe(
      true,
    );
    renderHeader(headerSection({ show_account: true }));
    expect(screen.getByTestId("member-entry")).toBeInTheDocument();
  });

  /*
   * 平台预渲染与其它没有 `publicProviders` 的宿主里 slot 是空的。
   * 这时必须什么都不画——否则静态 HTML 会先亮一枚登录按钮，SPA 接管后又抹掉。
   */
  it("没有提供方时不留占位", () => {
    const { container } = renderHeader(
      headerSection({ show_account: true }),
      { withSlot: false },
    );
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
    expect(container.querySelector("header")).toBeInTheDocument();
  });

  it("关掉开关后整块不出现", () => {
    renderHeader(headerSection({ show_account: false }));
    expect(screen.queryByTestId("member-entry")).not.toBeInTheDocument();
  });

  // 登录/账户由会员入口负责，次按钮不该再默认成第二个「登录」
  it("次按钮默认为空，不与账户入口重复", () => {
    const settings = headerSection().settings;
    expect(settings.secondary_label).toBe("");
    expect(settings.secondary_href).toBe("");

    renderHeader(headerSection());
    expect(screen.queryByRole("link", { name: /登录|Login/u })).toBeNull();
  });

  it("站长自己配的次按钮照常渲染", () => {
    renderHeader(
      headerSection({
        show_account: true,
        secondary_label: "联系我们",
        secondary_href: "/contact",
      }),
    );
    expect(screen.getByRole("link", { name: "联系我们" })).toHaveAttribute(
      "href",
      "/contact",
    );
    // 与账户入口并存，互不取代
    expect(screen.getByTestId("member-entry")).toBeInTheDocument();
  });
});
