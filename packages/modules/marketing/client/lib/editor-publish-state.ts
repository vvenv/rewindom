/**
 * Theme Editor 顶部工具栏的状态机。
 *
 * 编辑器里有两级「未同步」，工具栏原来把它们摆成两个长得一样的按钮，谁也分不清：
 *
 * ```
 * 编辑器内存  --保存-->  草稿（库）  --发布-->  线上（访客看到的）
 *            dirty                contentDirty / chromeDirty
 * ```
 *
 * 服务端两个发布入口做的是同一件事——`setPageStatus("published")` 也会把草稿正文
 * 提升到线上，所以「发布页面」与「发布页面更改」对用户是同一个动作，这里合成
 * 一个 `publish`，由调用方按 `published` 选路由。
 *
 * **页头页脚是站点级的，单独一条发布链**（改一次影响所有页面，所以不并进本页的
 * 发布）。但它同样要进这个状态机——否则「只改了页头并保存」会落进 `live`，
 * 状态点报「线上已是最新」，而草稿其实还没上线：租户照着这个绿点就走了，
 * 改动永远停在草稿里。
 */
export type EditorStage = "unsaved" | "unpublished" | "stale" | "live";

export interface EditorPublishState {
  stage: EditorStage;
  /** 当下该点哪个——同一时刻只有一个按钮是 primary，工具栏的「重点」由它决定。 */
  primary: "save" | "publish" | null;
  canSave: boolean;
  canPublish: boolean;
  /** 内存里这一版能退回已保存的草稿（纯前端，不碰服务端）。 */
  canDiscardLocal: boolean;
  /**
   * 已保存的草稿能退回线上那一版（正文 + 页头页脚，一起回滚）。
   *
   * 正文那半只对**已上线**的页面成立：没发布过的页面，无后缀列里躺的是建页初值，
   * 拿它当还原目标会给出一个用户从没见过的版本；页头页脚则任何时候都能还原。
   */
  canRevert: boolean;
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
  chromeDirty = false,
}: {
  dirty: boolean;
  published: boolean;
  contentDirty: boolean;
  chromeDirty?: boolean;
}): EditorPublishState {
  // 撤销与发布是同一条链的两个方向，两级各自独立成立：内存有改动就能退回草稿，
  // 草稿领先线上就能退回线上——所以不并进下面的四选一分支。
  const revert = {
    canDiscardLocal: dirty,
    canRevert: (published && contentDirty) || chromeDirty,
  };

  // 有未保存改动时不让直接发布：发出去的会是上一次保存的草稿，跟眼前看到的不是一回事
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

  if (!published) {
    return {
      stage: "unpublished",
      primary: "publish",
      canSave: false,
      canPublish: true,
      ...revert,
      statusKey: "editor.state.unpublished",
      tone: "muted",
      publishBlockedKey: undefined,
    };
  }

  if (contentDirty || chromeDirty) {
    return {
      stage: "stale",
      primary: "publish",
      canSave: false,
      canPublish: true,
      ...revert,
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
    ...revert,
    statusKey: "editor.state.live",
    tone: "emerald",
    publishBlockedKey: "editor.publishBlockedUpToDate",
  };
}
