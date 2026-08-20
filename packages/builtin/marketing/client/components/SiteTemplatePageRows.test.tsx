import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  registerHomeLayout,
  type HomeLayoutDefinition,
} from "../../shared/home-layouts.js";
import "../../shared/page-presets.js";
import {
  HOME_PAGE_KIND,
  registerPageTemplateKind,
  registerPageTemplatePreset,
} from "../../shared/page-templates.js";
import { MARKETING_I18N } from "../i18n.js";

import { SiteTemplatePageRows } from "./SiteTemplatePageRows.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { MarketingPageListItem } from "../../shared/site-cms.js";
import type { ReactNode } from "react";

/** 已落库那一行自己有一堆依赖（复制抽屉等）；这里只看两种状态各画成什么。 */
vi.mock("./SitePageGroupRow.js", () => ({
  SitePageGroupRow: ({ group }: { group: { kind: string } }) => (
    <div data-testid={`row-${group.kind}`} />
  ),
}));
vi.mock("./SitePageDuplicateSheet.js", () => ({
  SitePageDuplicateSheet: ({ children }: { children?: ReactNode }) =>
    children ?? null,
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const MANUAL_KIND = "rows_test_manual";
const LAYOUT_ENTITLEMENT = "rows_test_home";

registerPageTemplateKind({
  kind: MANUAL_KIND,
  slug: "rows-test-manual",
  path: "/rows-test-manual",
  group: "cms.homeTemplate",
  label: "preset.home.label",
  required_section: null,
  auto_init: false,
});
registerPageTemplatePreset(MANUAL_KIND, {
  key: MANUAL_KIND,
  label: "preset.home.label",
  kind: MANUAL_KIND,
  slug: "rows-test-manual",
  titleKey: "preset.home.title",
  descriptionKey: "preset.home.description",
  sections: [],
});

const ROWS_LAYOUT: HomeLayoutDefinition = {
  key: "rows_test.home",
  label: "preset.home.layoutLabel",
  group: "cms.notFoundTemplate",
  entitlement: LAYOUT_ENTITLEMENT,
  preset: {
    key: "rows_test.home",
    label: "preset.home.layoutLabel",
    kind: HOME_PAGE_KIND,
    slug: "home",
    titleKey: "preset.home.title",
    descriptionKey: "preset.home.description",
    sections: [{ type: "hero" }],
  },
};
registerHomeLayout(ROWS_LAYOUT);

const actions = {
  initializeTemplate: vi.fn(),
  initializeTemplatePendingKind: undefined,
  applyHomeLayout: vi.fn(),
  applyHomeLayoutPendingKey: undefined,
  homeLayoutKey: "marketing.default",
} as unknown as SitePageActions;

function renderRows(
  pages: MarketingPageListItem[],
  canWrite = true,
  entitlements: ReadonlySet<string> = new Set(),
  homeLayoutKey = "marketing.default",
) {
  return render(
    <MemoryRouter>
      <SiteTemplatePageRows
        pages={pages}
        defaultLocale="zh-CN"
        canWrite={canWrite}
        entitlements={entitlements}
        actions={{ ...actions, homeLayoutKey }}
      />
    </MemoryRouter>,
  );
}

function templatePage(kind: string): MarketingPageListItem {
  return {
    id: `page-${kind}`,
    slug: kind === HOME_PAGE_KIND ? "home" : "rows-test-manual",
    kind,
    locale: "zh-CN",
    title: "已经建好了",
    description: "",
    settings: {},
    visibility: "public",
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
  } as MarketingPageListItem;
}

function placeholderRow(path: string): HTMLElement {
  return screen.getByText(path).parentElement!.parentElement!;
}

describe("SiteTemplatePageRows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("还没落库的模板画成占位行，点一下就初始化", () => {
    renderRows([]);

    expect(screen.getByText("/rows-test-manual")).toBeTruthy();
    fireEvent.click(
      within(placeholderRow("/rows-test-manual")).getByRole("button", {
        name: "初始化版式",
      }),
    );
    expect(actions.initializeTemplate).toHaveBeenCalledWith(
      expect.stringContaining("rows_test_manual"),
    );
  });

  it("已落库就走正常的页面行，不再露出初始化按钮", () => {
    renderRows([templatePage(MANUAL_KIND)]);

    expect(screen.getByTestId(`row-${MANUAL_KIND}`)).toBeTruthy();
    expect(screen.queryByText("/rows-test-manual")).toBeNull();
  });

  it("只读用户看得到这张版式还没建，但没有按钮", () => {
    renderRows([], false);

    expect(screen.getByText("/rows-test-manual")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "初始化版式" })).toBeNull();
  });

  it("开通后未套用的首页版式出现在自己的分组，点一下套用", () => {
    renderRows([], true, new Set([LAYOUT_ENTITLEMENT]));

    const group = screen.getByText("404 页面").parentElement!;
    expect(within(group).getByText("空白首页")).toBeTruthy();
    fireEvent.click(within(group).getByRole("button", { name: "套用版式" }));
    expect(actions.applyHomeLayout).toHaveBeenCalledWith("rows_test.home");
  });

  it("套用后首页行落到该组，空白首页不再占一行", () => {
    renderRows(
      [templatePage(HOME_PAGE_KIND)],
      true,
      new Set([LAYOUT_ENTITLEMENT]),
      ROWS_LAYOUT.key,
    );

    const productGroup = screen.getByText("404 页面").parentElement!;
    expect(within(productGroup).getByTestId("row-home")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "套用版式" })).toBeNull();
  });
});
