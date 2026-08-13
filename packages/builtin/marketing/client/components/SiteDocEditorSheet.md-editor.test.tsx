import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../i18n.js";
import { SiteDocEditorSheet } from "./SiteDocEditorSheet.js";

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

const confirmMock = vi.fn().mockResolvedValue(false);

vi.mock("@rewindom/client-kit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rewindom/client-kit")>();
  return {
    ...actual,
    useConfirm: () => ({ confirm: confirmMock }),
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("./SiteDocCategorySheet.js", () => ({
  SiteDocCategorySheet: () => null,
}));

vi.mock("../hooks/useSite.js", () => ({
  useSite: () => ({
    data: { default_locale: "zh-CN" },
  }),
}));

vi.mock("../hooks/useSiteDocs.js", () => ({
  useCreateSiteDoc: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateSiteDoc: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePublishSiteDoc: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useSiteDoc: () => ({ data: undefined, isLoading: false }),
  useSiteDocsCatalog: () => ({
    data: { category_catalog: [] },
  }),
}));

describe("SiteDocEditorSheet with real MDEditor", () => {
  it("closes create sheet without discard confirm when untouched", async () => {
    confirmMock.mockClear();
    const onOpenChange = vi.fn();

    render(
      createElement(SiteDocEditorSheet, {
        open: true,
        onOpenChange,
        doc: null,
      }),
    );

    await waitFor(() => {
      expect(screen.getByLabelText("标题")).toBeInTheDocument();
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    expect(screen.queryByText("有未保存的修改")).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("关闭"));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
