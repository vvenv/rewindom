import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { MarketingDoc } from "../../shared/marketing-doc.js";

import {
  emptyForm,
  formFromFullDoc,
  isSameForm,
  useSiteDocEditorForm,
} from "./use-site-doc-editor-form.js";

const SAMPLE_DOC: MarketingDoc = {
  id: "doc-1",
  tenant_id: "tenant-1",
  slug: "intro",
  locale: "zh-CN",
  status: "draft",
  title: "Intro",
  title_draft: "Intro draft",
  description: "",
  description_draft: "Summary",
  body_md: "",
  body_md_draft: "# Hello",
  category: "",
  category_draft: "guide",
  sort_order: 0,
  sort_order_draft: 10,
  content_dirty: false,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("isSameForm", () => {
  it("treats identical snapshots as clean", () => {
    const form = emptyForm("en");
    expect(isSameForm(form, { ...form })).toBe(true);
  });
});

describe("formFromFullDoc", () => {
  it("maps draft columns into editor state", () => {
    expect(formFromFullDoc(SAMPLE_DOC)).toEqual({
      slug: "intro",
      title: "Intro draft",
      description: "Summary",
      category: "guide",
      body_md: "# Hello",
      sort_order: 10,
      locale: "zh-CN",
    });
  });
});

describe("useSiteDocEditorForm", () => {
  it("is not dirty before the create session is ready", () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useSiteDocEditorForm>[0]) =>
        useSiteDocEditorForm(props),
      {
        initialProps: {
          open: false,
          doc: null,
          fullDoc: undefined,
          defaultLocale: "zh-CN" as const,
        },
      },
    );

    act(() => {
      rerender({
        open: true,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      });
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.sessionReady).toBe(true);
  });

  it("is not dirty after hydrating create form without edits", () => {
    const { result } = renderHook(() =>
      useSiteDocEditorForm({
        open: true,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      }),
    );

    expect(result.current.isDirty).toBe(false);
    expect(result.current.form).toEqual(emptyForm("zh-CN"));
  });

  it("is not dirty while edit draft is still loading", () => {
    const { result } = renderHook(() =>
      useSiteDocEditorForm({
        open: true,
        doc: { id: "doc-1" } as never,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.sessionReady).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it("is dirty only after the user changes a ready session", () => {
    const { result } = renderHook(() =>
      useSiteDocEditorForm({
        open: true,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      }),
    );

    act(() => {
      result.current.patchForm({ title: "Changed" });
    });

    expect(result.current.isDirty).toBe(true);
  });

  it("ignores programmatic form patches without user intent", () => {
    const { result } = renderHook(() =>
      useSiteDocEditorForm({
        open: true,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      }),
    );

    act(() => {
      result.current.patchForm({ title: "Changed" }, { user: false });
    });

    expect(result.current.form.title).toBe("Changed");
    expect(result.current.isDirty).toBe(false);
  });

  it("clears dirty state when the sheet closes", () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useSiteDocEditorForm>[0]) =>
        useSiteDocEditorForm(props),
      {
        initialProps: {
          open: true,
          doc: null,
          fullDoc: undefined,
          defaultLocale: "zh-CN" as const,
        },
      },
    );

    act(() => {
      result.current.patchForm({ title: "Changed" });
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      rerender({
        open: false,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      });
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.sessionReady).toBe(false);
    expect(result.current.form).toEqual(emptyForm());
  });

  it("does not treat a reopened create sheet as dirty", () => {
    const { result, rerender } = renderHook(
      (props: Parameters<typeof useSiteDocEditorForm>[0]) =>
        useSiteDocEditorForm(props),
      {
        initialProps: {
          open: true,
          doc: null,
          fullDoc: undefined,
          defaultLocale: "zh-CN" as const,
        },
      },
    );

    act(() => {
      result.current.patchForm({ title: "Changed" });
    });

    act(() => {
      rerender({
        open: false,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      });
    });

    act(() => {
      rerender({
        open: true,
        doc: null,
        fullDoc: undefined,
        defaultLocale: "zh-CN",
      });
    });

    expect(result.current.isDirty).toBe(false);
    expect(result.current.form).toEqual(emptyForm("zh-CN"));
  });
});
