/**
 * 站点编辑器工具栏的状态机（打开页面与否共用一份）。
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
 * **站点级那几样（页头 / 页脚 / 主题）自成一条发布链**（改一次影响所有页面，所以不
 * 并进本页的发布）。但它们同样要进这个状态机——否则「只改了页头并保存」会落进
 * `live`，状态点报「线上已是最新」，而草稿其实还没上线：租户照着这个绿点就走了，
 * 改动永远停在草稿里。
 *
 * 页头页脚编辑器曾经另有一份 `resolveChromePublishState`：同样的四个字段、同样的
 * 分支，只有 `stale` 那句文案不同。两份状态机意味着往其中一个加一档就会漏掉另一个，
 * 所以合成这一个，差异收敛成 `scope`。没打开页面时没有「本页正文」这一维——站点级
 * 那几样始终是已上线的那一份，于是 `published` / `contentDirty` 给了默认值。
 */
export type EditorStage = "unsaved" | "unpublished" | "stale" | "live";

export interface EditorPublishState {
  stage: EditorStage;
  canSave: boolean;
  canPublish: boolean;
  /**
   * 发布前要不要先保存。内存里还有没落库的改动时为 true，发布按钮这时是
   * 「立即发布」：一次点完保存与发布。
   *
   * 服务端的 publish 没有 body——发出去的永远是库里那份草稿，所以「同时保存与
   * 发布」只能由前端串起来（存成功再发），做不成一个请求。
   */
  publishSavesFirst: boolean;
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

/** 在编辑哪一层——只影响 `stale` 那句文案该说「本页」还是「站点级那几样」。 */
export type EditorScope = "page" | "chrome";

export function resolveEditorPublishState({
  dirty,
  published = true,
  contentDirty = false,
  chromeDirty = false,
  scope = "page",
}: {
  dirty: boolean;
  published?: boolean;
  contentDirty?: boolean;
  chromeDirty?: boolean;
  scope?: EditorScope;
}): EditorPublishState {
  // 撤销与发布是同一条链的两个方向，两级各自独立成立：内存有改动就能退回草稿，
  // 草稿领先线上就能退回线上——所以不并进下面的四选一分支。
  const revert = {
    canDiscardLocal: dirty,
    canRevert: (published && contentDirty) || chromeDirty,
  };

  /*
   * 有未保存改动时**不是**不能发布，而是这一发得连保存一起做：直接发出去的会是
   * 上一次保存的草稿，跟眼前看到的不是一回事。
   *
   * 这里曾经把发布按钮置灰，让租户先点保存再点发布。两枚按钮点两次，中间还要看懂
   * tooltip 才知道为什么灰——而「把我改的这一版发出去」本来就是一个动作，于是
   * 改成 `publishSavesFirst`：按钮留在原位，文案变「立即发布」，一次点完。
   */
  if (dirty) {
    return {
      stage: "unsaved",
      canSave: true,
      canPublish: true,
      publishSavesFirst: true,
      ...revert,
      statusKey: "editor.state.unsaved",
      tone: "amber",
      publishBlockedKey: undefined,
    };
  }

  if (!published) {
    return {
      stage: "unpublished",
      canSave: false,
      canPublish: true,
      publishSavesFirst: false,
      ...revert,
      statusKey: "editor.state.unpublished",
      tone: "muted",
      publishBlockedKey: undefined,
    };
  }

  if (contentDirty || chromeDirty) {
    return {
      stage: "stale",
      canSave: false,
      canPublish: true,
      publishSavesFirst: false,
      ...revert,
      statusKey:
        scope === "chrome"
          ? "editor.state.siteDraftStale"
          : "editor.state.stale",
      tone: "amber",
      publishBlockedKey: undefined,
    };
  }

  return {
    stage: "live",
    canSave: false,
    canPublish: false,
    publishSavesFirst: false,
    ...revert,
    statusKey: "editor.state.live",
    tone: "emerald",
    publishBlockedKey: "editor.publishBlockedUpToDate",
  };
}
