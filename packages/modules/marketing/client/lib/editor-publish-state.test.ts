import { describe, expect, it } from "vitest";

import { resolveEditorPublishState } from "./editor-publish-state.js";

describe("resolveEditorPublishState", () => {
  it("points at 保存 while there are unsaved edits, and blocks publish", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      published: true,
      contentDirty: false,
    });

    expect(state.stage).toBe("unsaved");
    expect(state.primary).toBe("save");
    expect(state.canSave).toBe(true);
    // 发的会是上次保存的草稿，不是眼前这一版
    expect(state.canPublish).toBe(false);
    expect(state.publishBlockedKey).toBe("editor.publishBlockedUnsaved");
  });

  it("points at 发布 for a saved draft that was never published", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: false,
      contentDirty: false,
    });

    expect(state.stage).toBe("unpublished");
    expect(state.primary).toBe("publish");
    expect(state.canPublish).toBe(true);
    expect(state.canSave).toBe(false);
  });

  it("points at 发布 when the live version fell behind the saved draft", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: true,
    });

    expect(state.stage).toBe("stale");
    expect(state.primary).toBe("publish");
    expect(state.canPublish).toBe(true);
    expect(state.tone).toBe("amber");
  });

  it("has no primary action once live matches the draft", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: false,
    });

    expect(state.stage).toBe("live");
    expect(state.primary).toBeNull();
    expect(state.canSave).toBe(false);
    expect(state.canPublish).toBe(false);
    expect(state.tone).toBe("emerald");
    expect(state.publishBlockedKey).toBe("editor.publishBlockedUpToDate");
  });

  it("treats unsaved edits as the top priority even on a stale published page", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      published: true,
      contentDirty: true,
    });

    expect(state.stage).toBe("unsaved");
    expect(state.primary).toBe("save");
    // 两级撤销互不遮挡：既能退回已保存的草稿，也能一路退回线上
    expect(state.canDiscardLocal).toBe(true);
    expect(state.canRevertContent).toBe(true);
  });

  it("offers no revert once live, draft and editor all agree", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: false,
    });

    expect(state.canDiscardLocal).toBe(false);
    expect(state.canRevertContent).toBe(false);
  });

  // 没发布过的页面，无后缀列里是建页初值，还原过去等于给出一个用户没见过的版本
  it("never offers 撤销未发布的更改 on a page that was never published", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      published: false,
      contentDirty: true,
    });

    expect(state.canRevertContent).toBe(false);
    // 但内存这一版仍能退回已保存的草稿
    expect(state.canDiscardLocal).toBe(true);
  });
});
