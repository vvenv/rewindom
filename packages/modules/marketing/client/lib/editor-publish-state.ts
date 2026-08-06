/**
 * Theme Editor 顶部工具栏的状态机。
 *
 * 编辑器里有两级「未同步」，工具栏原来把它们摆成两个长得一样的按钮，谁也分不清：
 *
 * ```
 * 编辑器内存  --保存-->  草稿（库）  --发布-->  线上（访客看到的）
 *            dirty                contentDirty
 * ```
 *
 * 服务端两个发布入口做的是同一件事——`setPageStatus("published")` 也会把草稿正文
 * 提升到线上，所以「发布页面」与「发布页面更改」对用户是同一个动作，这里合成
 * 一个 `publish`，由调用方按 `published` 选路由。
 */
export type EditorStage = "unsaved" | "unpublished" | "stale" | "live";

export interface EditorPublishState {
  stage: EditorStage;
  /** 当下该点哪个——同一时刻只有一个按钮是 primary，工具栏的「重点」由它决定。 */
  primary: "save" | "publish" | null;
  canSave: boolean;
  canPublish: boolean;
  /** 状态点与文案的 i18n key。 */
  statusKey: string;
  tone: "amber" | "emerald" | "muted";
  /** 按钮不可点时，鼠标悬停要给出的原因；可点时为 undefined。 */
  publishBlockedKey: string | undefined;
}

export function resolveEditorPublishState({
  dirty,
  published,
  contentDirty,
}: {
  dirty: boolean;
  published: boolean;
  contentDirty: boolean;
}): EditorPublishState {
  // 有未保存改动时不让直接发布：发出去的会是上一次保存的草稿，跟眼前看到的不是一回事
  if (dirty) {
    return {
      stage: "unsaved",
      primary: "save",
      canSave: true,
      canPublish: false,
      statusKey: "editor.state.unsaved",
      tone: "amber",
      publishBlockedKey: "editor.publishBlockedUnsaved",
    };
  }

  if (!published) {
    return {
      stage: "unpublished",
      primary: "publish",
      canSave: false,
      canPublish: true,
      statusKey: "editor.state.unpublished",
      tone: "muted",
      publishBlockedKey: undefined,
    };
  }

  if (contentDirty) {
    return {
      stage: "stale",
      primary: "publish",
      canSave: false,
      canPublish: true,
      statusKey: "editor.state.stale",
      tone: "amber",
      publishBlockedKey: undefined,
    };
  }

  return {
    stage: "live",
    primary: null,
    canSave: false,
    canPublish: false,
    statusKey: "editor.state.live",
    tone: "emerald",
    publishBlockedKey: "editor.publishBlockedUpToDate",
  };
}
