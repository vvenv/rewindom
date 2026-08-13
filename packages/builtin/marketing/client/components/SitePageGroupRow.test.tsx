import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";
import { groupSitePages, type SitePageGroup } from "../lib/site-page-groups.js";

import {
  SitePageGroupRow,
  type SitePageGroupOrder,
} from "./SitePageGroupRow.js";

import type { SitePageActions } from "../hooks/use-site-page-actions.js";
import type { MarketingPageListItem } from "../../shared/site-cms.js";
import type { ReactNode } from "react";

/** 复制抽屉自己会拉站点数据；这里只验行的排布，把它压成透传的 trigger。 */
vi.mock("./SitePageDuplicateSheet.js", () => ({
  SitePageDuplicateSheet: ({ children }: { children?: ReactNode }) =>
    children ?? null,
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const actions: SitePageActions = {
  publishPendingId: undefined,
  unpublishPendingId: undefined,
  deletePendingId: undefined,
  resetPresetPendingId: undefined,
  reorderPending: false,
  togglePublish: vi.fn(),
  remove: vi.fn(async () => {}),
  resetPreset: vi.fn(async () => {}),
  move: vi.fn(),
};

function page(
  partial: Partial<MarketingPageListItem> &
    Pick<MarketingPageListItem, "id" | "locale">,
): MarketingPageListItem {
  return {
    slug: "about",
    kind: "page",
    title: "关于我们",
    description: "",
    settings: {},
    visibility: "public",
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function renderGroup(
  pages: MarketingPageListItem[],
  order?: Partial<SitePageGroupOrder>,
) {
  const group = groupSitePages(pages, "zh-CN")[0]!;
  return renderRow(group, order);
}

function renderRow(
  group: SitePageGroup,
  order?: Partial<SitePageGroupOrder>,
) {
  return render(
    <MemoryRouter>
      <SitePageGroupRow
        group={group}
        defaultLocale="zh-CN"
        canWrite
        actions={actions}
        order={
          order
            ? {
                canMoveUp: true,
                canMoveDown: true,
                pending: false,
                onMove: vi.fn(),
                ...order,
              }
            : undefined
        }
      />
    </MemoryRouter>,
  );
}

async function openMoreMenu(): Promise<void> {
  const trigger = screen.getByRole("button", { name: "更多操作" });
  // Radix Dropdown 靠 pointer 打开；纯 click 在 jsdom 里经常不开
  fireEvent.pointerDown(trigger, { button: 0, ctrlX: 0, ctrlY: 0 });
  fireEvent.click(trigger);
  await waitFor(() => {
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
}

describe("SitePageGroupRow", () => {
  it("collapses a single-language group into one row (no repeated locale line)", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN" })]);

    expect(screen.getByRole("link", { name: "关于我们" })).toHaveAttribute(
      "href",
      "/app/site/editor?page=zh",
    );
    expect(screen.getByText("/about")).toBeInTheDocument();
    // 语言名是多语言组才有的第二层，单语言时不该出现
    expect(screen.queryByText("中文")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("expands a multi-language group into one row per locale", () => {
    renderGroup([
      page({ id: "zh", locale: "zh-CN" }),
      page({ id: "en", locale: "en", title: "About" }),
    ]);

    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    // 语言行本身就是进那一语言编辑器的链接（整行热区）
    expect(
      within(rows[0]!).getByRole("link", { name: "中文" }),
    ).toHaveAttribute("href", "/app/site/editor?page=zh");
    expect(within(rows[1]!).getByText("English")).toBeInTheDocument();
    // 组头只出现一次，标题不在语言行里重复
    expect(screen.getAllByRole("link", { name: "关于我们" })).toHaveLength(1);
  });

  it("flags a published page whose draft moved ahead of the live version", () => {
    renderGroup([
      page({
        id: "zh",
        locale: "zh-CN",
        status: "published",
        content_dirty: true,
      }),
    ]);

    expect(screen.getByText("有改动未发布")).toBeInTheDocument();
    expect(screen.queryByText("已发布")).not.toBeInTheDocument();
  });

  it("shows plain published state when the draft is in sync", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN", status: "published" })]);

    expect(screen.getByText("已发布")).toBeInTheDocument();
  });

  it("marks a members-only page", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN", visibility: "members" })]);

    expect(screen.getByText("仅会员")).toBeInTheDocument();
  });

  it("moves the group with one click, and stops at the ends", () => {
    const onMove = vi.fn();
    renderGroup([page({ id: "zh", locale: "zh-CN" })], {
      canMoveUp: false,
      onMove,
    });

    // 到头的按钮禁用而不是消失：行的操作数不该忽多忽少
    expect(screen.getByRole("button", { name: "上移" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "下移" }));
    expect(onMove).toHaveBeenCalledWith(1);
  });

  it("puts the ordering buttons on the group header, not on each locale row", () => {
    renderGroup(
      [
        page({ id: "zh", locale: "zh-CN" }),
        page({ id: "en", locale: "en", title: "About" }),
      ],
      {},
    );

    // 顺序是整组的属性，一组只该有一对上下移
    expect(screen.getAllByRole("button", { name: "上移" })).toHaveLength(1);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(within(rows[0]!).queryByRole("button", { name: "上移" })).toBeNull();
  });

  it("offers no ordering buttons when the list is not orderable", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN" })]);

    expect(screen.queryByRole("button", { name: "上移" })).toBeNull();
  });

  it("keeps publish on the row and the rest behind the more menu", () => {
    renderGroup([page({ id: "zh", locale: "zh-CN" })]);

    // 发布是最高频的一步，不该埋进菜单；删除等收进「更多」
    expect(screen.getByRole("button", { name: "发布" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "更多操作" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除" })).toBeNull();
    expect(screen.queryByRole("button", { name: "复制" })).toBeNull();
  });

  it("omits delete for built-in template pages (home / docs layouts)", async () => {
    const home = page({
      id: "home-zh",
      locale: "zh-CN",
      kind: "home",
      slug: "home",
      title: "首页",
    });
    // 模板页不进 groupSitePages，模板行自己组 SitePageGroup
    renderRow({
      kind: "home",
      slug: "home",
      path: "/",
      title: "首页",
      pages: [home],
    });

    await openMoreMenu();
    expect(screen.getByRole("menuitem", { name: "复制" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "删除" })).toBeNull();
  });

  it("offers delete for ordinary pages", async () => {
    renderGroup([page({ id: "zh", locale: "zh-CN" })]);

    await openMoreMenu();
    expect(screen.getByRole("menuitem", { name: "删除" })).toBeInTheDocument();
  });
});