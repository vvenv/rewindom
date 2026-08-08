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
    expect(state.canRevert).toBe(true);
  });

  it("offers no revert once live, draft and editor all agree", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: false,
    });

    expect(state.canDiscardLocal).toBe(false);
    expect(state.canRevert).toBe(false);
  });

  // 没发布过的页面，无后缀列里是建页初值，还原过去等于给出一个用户没见过的版本
  it("never offers 撤销未发布的更改 on a page that was never published", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      published: false,
      contentDirty: true,
    });

    expect(state.canRevert).toBe(false);
    // 但内存这一版仍能退回已保存的草稿
    expect(state.canDiscardLocal).toBe(true);
  });
});

/*
 * 页头页脚不再是独立的一条发布链：它和本页正文一起进「有未发布的更改」。
 * 拆开时工具栏长出了第三种状态、第三个主按钮和第三条撤销，而站长的心智只有一个
 *「把我刚才改的发出去」——改完页头却看到「线上已是最新」，正是拆开的代价。
 */
describe("页头页脚并入同一条发布链", () => {
  it("只改页头也算「有未发布的更改」", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: false,
      chromeDirty: true,
    });

    expect(state.stage).toBe("stale");
    expect(state.primary).toBe("publish");
    expect(state.canPublish).toBe(true);
    // 撤销也是一条：正文与页头一起回滚
    expect(state.canRevert).toBe(true);
  });

  it("两边都干净才是 live", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: false,
      chromeDirty: false,
    });

    expect(state.stage).toBe("live");
    expect(state.primary).toBeNull();
    expect(state.canRevert).toBe(false);
  });

  // 未保存优先：保存本来就把正文与页头一起落库
  it("未保存改动仍然优先于发布", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      published: true,
      contentDirty: false,
      chromeDirty: true,
    });

    expect(state.stage).toBe("unsaved");
    expect(state.primary).toBe("save");
  });

  // 页面没上线过时正文没有「线上版」可回，但页头照样能还原
  it("未发布的页面靠页头脏也能撤销", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: false,
      contentDirty: true,
      chromeDirty: true,
    });

    expect(state.canRevert).toBe(true);
  });
});
