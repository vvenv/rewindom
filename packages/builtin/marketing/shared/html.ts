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

/**
 * JSON-LD 进 `<script type="application/ld+json">` 的正文。
 *
 * 不能走 `escapeHtml`：script 里不解码 HTML 实体，`"` 变成 `&quot;` 之后
 * Google 报 "JSON-LD block 1: invalid JSON"，`JSON.parse` 同样挂。
 * `<` / `>` / `&` 换成 JSON 的 `\uXXXX`，避免标题里的 `</script>` 提前结束标签。
 */
export function jsonLdScriptText(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026");
}
