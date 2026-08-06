/**
 * SSR 拼字符串时的 HTML 转义。
 *
 * 放在 `shared/` 而不是 `server/`：各段的 SSR 渲染器（`sections/<type>/html.ts`）也要用它，
 * 而 `shared/` 不能反向依赖 `server/`。函数本身是纯的，不带任何服务端依赖。
 */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
