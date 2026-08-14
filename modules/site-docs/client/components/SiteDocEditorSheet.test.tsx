import { registerI18nBundles, setupI18n } from "@rewindom/module-sdk/client";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { SITE_DOCS_I18N } from "../i18n.js";
import { SiteDocEditorSheet } from "./SiteDocEditorSheet.js";

import { type SiteDoc, type SiteDocListItem  } from "../../shared/site-doc.js";

registerI18nBundles([SITE_DOCS_I18N]);
setupI18n("zh-CN");

const confirmMock = vi.fn();

vi.mock("@rewindom/module-sdk/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@rewindom/module-sdk/client")>();
  return {
    ...actual,
    useConfirm: () => ({ confirm: confirmMock }),
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@uiw/react-md-editor", () => ({
  default: ({
    value,
    onChange,
    textareaProps,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    textareaProps?: { id?: string; placeholder?: string };
  }) =>
    createElement("textarea", {
      id: textareaProps?.id,
      placeholder: textareaProps?.placeholder,
      value: value ?? "",
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) =>
        onChange?.(event.target.value),
    }),
}));

const FULL_DOC: SiteDoc = {
  id: "doc-1",
  tenant_id: "tenant-1",
  slug: "intro",
  locale: "zh-CN",
  status: "published",
  title: "Intro",
  title_draft: "Intro draft",
  description: "",
  description_draft: "Summary",
  body_md: "live",
  body_md_draft: "# Hello",
  category: "intro",
  category_draft: "intro",
  sort_order: 0,
  sort_order_draft: 10,
  content_dirty: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const LIST_DOC: SiteDocListItem = {
  id: "doc-1",
  slug: "intro",
  title: "Intro",
  description: "",
  category: "intro",
  category_label: "入门",
  locale: "zh-CN",
  status: "published",
  content_dirty: false,
  sort_order: 0,
  updated_at: "2026-01-01T00:00:00.000Z",
};

const categoryCatalog = [
  {
    id: "cat-1",
    tenant_id: "tenant-1",
    key: "intro",
    label: "入门",
    sort_order: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
];

let catalogData: typeof categoryCatalog | [] = categoryCatalog;
let fullDocData: SiteDoc | undefined = FULL_DOC;

vi.mock("../../../../packages/builtin/marketing/client/hooks/useSite.js", () => ({
  useSite: () => ({
    data: { default_locale: "zh-CN" },
  }),
}));

vi.mock("./SiteDocCategorySheet.js", () => ({
  SiteDocCategorySheet: () => null,
}));

vi.mock("../hooks/useSiteDocs.js", () => ({
  useCreateSiteDoc: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateSiteDoc: () => ({ isPending: false, mutateAsync: vi.fn() }),
  usePublishSiteDoc: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useSiteDoc: () => ({
    data: fullDocData,
    isLoading: false,
  }),
  useSiteDocsCatalog: () => ({
    data: {
      category_catalog: catalogData,
    },
  }),
}));

function renderEditor({
  open = true,
  doc = null,
}: {
  open?: boolean;
  doc?: SiteDocListItem | null;
}): { onOpenChange: ReturnType<typeof vi.fn> } {
  const onOpenChange = vi.fn();
  render(
    createElement(SiteDocEditorSheet, {
      open,
      onOpenChange,
      doc,
    }),
  );
  return { onOpenChange };
}

describe("SiteDocEditorSheet", () => {
  it("closes create sheet without discard confirm when untouched", async () => {
    confirmMock.mockReset();
    catalogData = categoryCatalog;
    fullDocData = FULL_DOC;
    const { onOpenChange } = renderEditor({ doc: null });

    await waitFor(() => {
      expect(screen.getByLabelText("标题")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("关闭"));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(confirmMock).not.toHaveBeenCalled();
    expect(screen.queryByText("有未保存的修改")).not.toBeInTheDocument();
  });

  it("closes edit sheet without discard confirm when untouched", async () => {
    confirmMock.mockReset();
    catalogData = categoryCatalog;
    fullDocData = FULL_DOC;
    const { onOpenChange } = renderEditor({ doc: LIST_DOC });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Intro draft")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("关闭"));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it("stays clean when category catalog loads after edit hydrate", async () => {
    confirmMock.mockReset();
    catalogData = [];
    fullDocData = FULL_DOC;
    const onOpenChange = vi.fn();

    const { rerender } = render(
      createElement(SiteDocEditorSheet, {
        open: true,
        onOpenChange,
        doc: LIST_DOC,
      }),
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Intro draft")).toBeInTheDocument();
    });

    catalogData = categoryCatalog;
    rerender(
      createElement(SiteDocEditorSheet, {
        open: true,
        onOpenChange,
        doc: LIST_DOC,
      }),
    );

    await waitFor(() => {
      expect(screen.queryByText("有未保存的修改")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("关闭"));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(confirmMock).not.toHaveBeenCalled();
  });
});
