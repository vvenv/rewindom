import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../../i18n.js";
import { resolveEditorPublishState } from "../../lib/editor-publish-state.js";
import "../../../shared/page-presets.js";

import { PageEditorToolbar } from "./PageEditorToolbar.js";

import type { MarketingPage } from "../../../shared/site-cms.js";

vi.mock("../SitePageDuplicateSheet.js", () => ({
  SitePageDuplicateSheet: () => null,
}));

vi.mock("./PageVersionsSheet.js", () => ({
  PageVersionsSheet: () => null,
}));

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

function page(
  partial: Partial<MarketingPage> & Pick<MarketingPage, "id" | "kind" | "slug">,
): MarketingPage {
  return {
    tenant_id: "t1",
    locale: "zh-CN",
    title: "首页",
    description: "",
    sections: [],
    settings: {},
    visibility: "public",
    status: "draft",
    content_dirty: false,
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function renderToolbar(
  current: MarketingPage,
  extras: {
    onResetPreset?: () => void;
    resetPresetPending?: boolean;
  } = {},
) {
  const onResetPreset = extras.onResetPreset ?? vi.fn();
  render(
    <PageEditorToolbar
      page={current}
      currentTitle={current.title}
      localePages={[]}
      localeVariants={[]}
      locale="zh-CN"
      state={resolveEditorPublishState({ dirty: false, published: false })}
      canWrite
      pending={{ saving: false, publishing: false, reverting: false }}
      onGoToPage={vi.fn()}
      onDuplicated={vi.fn()}
      onSave={vi.fn()}
      onPublish={vi.fn()}
      onPublishNow={vi.fn()}
      onUnpublish={vi.fn()}
      onDiscardLocal={vi.fn()}
      onRevert={vi.fn()}
      onResetPreset={onResetPreset}
      resetPresetPending={extras.resetPresetPending}
    />,
  );
  return { onResetPreset };
}

async function openMoreMenu(): Promise<void> {
  const trigger = screen.getByRole("button", { name: "更多操作" });
  fireEvent.pointerDown(trigger, { button: 0, ctrlX: 0, ctrlY: 0 });
  fireEvent.click(trigger);
  await waitFor(() => {
    expect(screen.getByRole("menu")).toBeInTheDocument();
  });
}

describe("PageEditorToolbar", () => {
  it("offers reset layout for a template page", async () => {
    const { onResetPreset } = renderToolbar(
      page({ id: "home-1", kind: "home", slug: "home" }),
    );

    await openMoreMenu();
    const item = screen.getByRole("menuitem", { name: "重设版式" });
    fireEvent.click(item);
    expect(onResetPreset).toHaveBeenCalledOnce();
  });

  it("hides reset layout on an ordinary page", async () => {
    renderToolbar(
      page({ id: "about-1", kind: "page", slug: "about", title: "关于" }),
    );

    await openMoreMenu();
    expect(screen.queryByRole("menuitem", { name: "重设版式" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "复制" })).toBeInTheDocument();
  });

  it("disables reset layout while the request is in flight", async () => {
    renderToolbar(page({ id: "home-1", kind: "home", slug: "home" }), {
      resetPresetPending: true,
    });

    await openMoreMenu();
    expect(screen.getByRole("menuitem", { name: "重设版式" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
