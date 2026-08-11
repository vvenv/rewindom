/**
 * 页头页脚编辑器的发布状态（不涉及页面正文）。
 *
 * ```
 * 编辑器内存  --保存-->  草稿（库）  --发布-->  线上（访客看到的）
 *            dirty                chromeDirty
 * ```
 */
export type ChromeEditorStage = "unsaved" | "stale" | "live";

export interface ChromeEditorPublishState {
  stage: ChromeEditorStage;
  primary: "save" | "publish" | null;
  canSave: boolean;
  canPublish: boolean;
  canDiscardLocal: boolean;
  canRevert: boolean;
  statusKey: string;
  tone: "amber" | "emerald" | "muted";
  publishBlockedKey: string | undefined;
}

export function resolveChromePublishState({
  dirty,
  chromeDirty = false,
}: {
  dirty: boolean;
  chromeDirty?: boolean;
}): ChromeEditorPublishState {
  const revert = {
    canDiscardLocal: dirty,
    canRevert: chromeDirty,
  };

  if (dirty) {
    return {
      stage: "unsaved",
      primary: "save",
      canSave: true,
      canPublish: false,
      ...revert,
      statusKey: "editor.state.unsaved",
      tone: "amber",
      publishBlockedKey: "editor.publishBlockedUnsaved",
    };
  }

  if (chromeDirty) {
    return {
      stage: "stale",
      primary: "publish",
      canSave: false,
      canPublish: true,
      ...revert,
      statusKey: "chromeEditor.state.stale",
      tone: "amber",
      publishBlockedKey: undefined,
    };
  }

  return {
    stage: "live",
    primary: null,
    canSave: false,
    canPublish: false,
    ...revert,
    statusKey: "editor.state.live",
    tone: "emerald",
    publishBlockedKey: "editor.publishBlockedUpToDate",
  };
}
