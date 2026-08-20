import { describe, expect, it } from "vitest";

import { resolveEditorPublishState } from "./editor-publish-state.js";

describe("resolveEditorPublishState", () => {
  it("turns 发布 into 立即发布 while there are unsaved edits", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      published: true,
      contentDirty: false,
    });

    expect(state.stage).toBe("unsaved");
    expect(state.canSave).toBe(true);
    // 发得出去，但得先把眼前这一版存下来——直发的会是上次保存的草稿
    expect(state.canPublish).toBe(true);
    expect(state.publishSavesFirst).toBe(true);
    expect(state.publishBlockedKey).toBeUndefined();
  });

  it("points at 发布 for a saved draft that was never published", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: false,
      contentDirty: false,
    });

    expect(state.stage).toBe("unpublished");
    expect(state.canPublish).toBe(true);
    expect(state.canSave).toBe(false);
    // 草稿已经落库，这一发不用再存
    expect(state.publishSavesFirst).toBe(false);
  });

  it("points at 发布 when the live version fell behind the saved draft", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: true,
    });

    expect(state.stage).toBe("stale");
    expect(state.canPublish).toBe(true);
    expect(state.publishSavesFirst).toBe(false);
    expect(state.tone).toBe("amber");
  });

  it("has nothing left to do once live matches the draft", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      published: true,
      contentDirty: false,
    });

    expect(state.stage).toBe("live");
    expect(state.canSave).toBe(false);
    expect(state.canPublish).toBe(false);
    expect(state.publishSavesFirst).toBe(false);
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
    expect(state.publishSavesFirst).toBe(true);
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
    expect(state.canPublish).toBe(false);
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
    expect(state.publishSavesFirst).toBe(true);
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

/**
 * 没打开页面时走同一个状态机（原来另有一份 `resolveChromePublishState`）：
 * 不传 `published` / `contentDirty`，只有 `stale` 那句文案换成站点级的说法。
 */
describe("resolveEditorPublishState（站点级：页头页脚 + 主题）", () => {
  it("有未保存改动时发布要先存一遍", () => {
    const state = resolveEditorPublishState({
      dirty: true,
      chromeDirty: true,
      scope: "chrome",
    });

    expect(state.canSave).toBe(true);
    // 站点级也一样：一次点完保存与发布
    expect(state.publishSavesFirst).toBe(true);
  });

  it("草稿领先线上时给发布，文案指名是站点级那几样", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      chromeDirty: true,
      scope: "chrome",
    });

    expect(state.canPublish).toBe(true);
    expect(state.publishSavesFirst).toBe(false);
    expect(state.canRevert).toBe(true);
    expect(state.statusKey).toBe("editor.state.siteDraftStale");
  });

  it("都不脏就是线上最新", () => {
    const state = resolveEditorPublishState({
      dirty: false,
      chromeDirty: false,
      scope: "chrome",
    });

    expect(state.stage).toBe("live");
    expect(state.canPublish).toBe(false);
  });

  /** 缺省 `published: true` 不能让页面编辑器的「未上线」档意外走进页头页脚。 */
  it("不传 published 时不会落进未上线档", () => {
    const state = resolveEditorPublishState({ dirty: false, scope: "chrome" });

    expect(state.stage).not.toBe("unpublished");
  });
});
