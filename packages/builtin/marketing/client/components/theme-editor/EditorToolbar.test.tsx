import { registerI18nBundles, setupI18n } from "@rewindom/client-kit";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MARKETING_I18N } from "../../i18n.js";
import { resolveEditorPublishState } from "../../lib/editor-publish-state.js";

import { EditorToolbar } from "./EditorToolbar.js";

registerI18nBundles([MARKETING_I18N]);
setupI18n("zh-CN");

function renderToolbar(
  input: Parameters<typeof resolveEditorPublishState>[0],
  pending = { saving: false, publishing: false, reverting: false },
) {
  const handlers = {
    onSave: vi.fn(),
    onPublish: vi.fn(),
    onPublishNow: vi.fn(),
    onDiscardLocal: vi.fn(),
    onRevert: vi.fn(),
  };
  render(
    <EditorToolbar
      state={resolveEditorPublishState(input)}
      canWrite
      pending={pending}
      publishLabelKey="cms.publish"
      {...handlers}
    />,
  );
  return handlers;
}

/**
 * 工具栏右边永远只有两枚按钮：保存草稿 + 发布。有未保存改动时右边那枚换成
 * 「立即发布」（存 + 发一次做完），而不是再摆一枚——见 `EditorToolbar` 的注释。
 */
describe("EditorToolbar", () => {
  it("有未保存改动时右边是「立即发布」，一次点完保存与发布", () => {
    const handlers = renderToolbar({ dirty: true, published: true });

    expect(screen.queryByRole("button", { name: "发布" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "立即发布" }));
    expect(handlers.onPublishNow).toHaveBeenCalledOnce();
    expect(handlers.onPublish).not.toHaveBeenCalled();
  });

  it("「保存草稿」仍然单独留着：只想存不想上线", () => {
    const handlers = renderToolbar({ dirty: true, published: true });

    const save = screen.getByRole("button", { name: "保存草稿" });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(handlers.onSave).toHaveBeenCalledOnce();
    expect(handlers.onPublishNow).not.toHaveBeenCalled();
  });

  it("草稿已落库时是普通「发布」，保存草稿没东西可存", () => {
    const handlers = renderToolbar({
      dirty: false,
      published: true,
      contentDirty: true,
    });

    expect(screen.queryByRole("button", { name: "立即发布" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "发布" }));
    expect(handlers.onPublish).toHaveBeenCalledOnce();
    expect(handlers.onPublishNow).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeDisabled();
  });

  it("线上已是最新时发布置灰，并说明为什么", () => {
    renderToolbar({ dirty: false, published: true, contentDirty: false });

    const publish = screen.getByRole("button", { name: "发布" });
    expect(publish).toBeDisabled();
    expect(publish).toHaveAttribute(
      "title",
      "线上已经和当前草稿一致，没有要发布的改动。",
    );
  });

  // 「立即发布」跨两个请求，转圈期间两枚都得锁住，免得草稿被存两遍
  it("发布途中两枚按钮一起锁住", () => {
    renderToolbar(
      { dirty: true, published: true },
      { saving: false, publishing: true, reverting: false },
    );

    // 转圈那枚的可读名字被 Spinner 的 "Loading" 顶在前面，所以按正则找
    expect(screen.getByRole("button", { name: /立即发布/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "保存草稿" })).toBeDisabled();
  });
});
