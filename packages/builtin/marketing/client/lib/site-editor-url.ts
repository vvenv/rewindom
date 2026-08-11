/**
 * 编辑器的 URL 状态：**在调哪一层**（`scope`）与**正在看哪一页**（`page`）。
 *
 * 只有两层：
 *
 * - `sections`（默认）——区块树。页头 / 页面区块 / 页脚本来就同构地摆在同一棵树里，
 *   所以「改页头」不是另一个作用域，点树上那一行即可；带 `?page=` 时树里多出页面
 *   那一段，不带就只有页头页脚。
 * - `theme`——站点主题（配色 / 字体 / 版式 / 品牌资产）。它不是树上的一个对象，
 *   没法用选中来表达，才需要单独一层。
 *
 * 两者都放 URL 上：刷新、收藏、从官网卡片的「外观」直接链进主题层都成立；换页也仍然是
 * 一次导航（页面按语言分行存，换页 / 换语言本来就是换对象，不是本地状态）。
 */
export const EDITOR_SCOPES = ["sections", "theme"] as const;

export type EditorScope = (typeof EDITOR_SCOPES)[number];

export function parseEditorScope(raw: string | null): EditorScope {
  return EDITOR_SCOPES.includes(raw as EditorScope)
    ? (raw as EditorScope)
    : "sections";
}

/** 编辑器地址：`pageId` 缺省表示只调站点级的东西（页头页脚 / 主题）。 */
export function siteEditorPath(options?: {
  pageId?: string | null;
  scope?: EditorScope;
}): string {
  const params = new URLSearchParams();
  if (options?.pageId) params.set("page", options.pageId);
  // `sections` 是默认作用域，不写进 URL
  if (options?.scope && options.scope !== "sections") {
    params.set("scope", options.scope);
  }
  const query = params.toString();
  return query ? `/app/site/editor?${query}` : "/app/site/editor";
}
