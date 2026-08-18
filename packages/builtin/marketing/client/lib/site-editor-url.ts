/**
 * 编辑器的 URL 状态：**在调哪一层**（`scope`）与**正在看哪一页**（`page`）。
 *
 * 只有两层，入口拆开：
 *
 * - `sections`（默认）——区块树。从页面行进来（`?page=`）；页头 / 页面区块 / 页脚
 *   同构地摆在同一棵树里。不带 `page` 就只有页头页脚。
 * - `theme`——站点外观（Logo / 配色 / 字体 / 版式）。从官网卡片「外观」进来
 *   （`?scope=theme`，不带页面）；不是树上的对象，也不是页面编辑器里的一层。
 *
 * 两者都放 URL 上：刷新、收藏、深链都成立。
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
