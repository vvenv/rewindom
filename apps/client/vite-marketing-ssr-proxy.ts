import { isSiteSsrExceptionPath } from "@rewindom/builtin/marketing/shared/site-app-prefixes.js";

/**
 * 应用区一级路径：开发态不代理给 Marketing SSR，交回 Vite SPA。
 * 须与 `SITE_APP_PREFIXES`（`packages/builtin/marketing/shared/site-app-prefixes.ts`）
 * 及 nginx SPA location 对齐——见 `nginx-spa-prefixes.test.ts`。
 *
 * 这里只从 `site-app-prefixes` 取函数，不要 import `site-locale`：后者依赖
 * `@rewindom/shared`，Vite 加载 config 时 Node 无法解析 shared 的 `.js`→`.ts`。
 */
const SPA_ROUTE_PREFIXES = [
  // 租户工作台已统一收在 /app/* 之下，所以这里只需要一个 app
  "app",
  "login",
  "register",
  "auth",
  "member",
  "shop",
  "platform",
  "api",
  "assets",
  // Vite dev 专用
  "src",
  "node_modules",
] as const;

export const SPA_PREFIX_RE = new RegExp(
  `^\\/(${SPA_ROUTE_PREFIXES.join("|")})(\\/|$)`,
  "u",
);

/**
 * Vite dev server 内置路径（`/@vite/client`、`/@fs/...` 等）。
 * `SPA_PREFIX_RE` 里的裸 `@` 只能匹配 `/@` 本身，盖不住这些路径。
 */
export const VITE_DEV_INTERNAL_RE =
  /^\/(@vite|@react-refresh|@fs|@id|\.vite)(\/|$)/u;

function pathOnly(url: string): string {
  return url.split(/[?#]/u)[0] ?? url;
}

export function shouldBypassMarketingSsrProxy(url: string): boolean {
  if (isSiteSsrExceptionPath(pathOnly(url))) return false;
  return SPA_PREFIX_RE.test(url) || VITE_DEV_INTERNAL_RE.test(url);
}

export function shouldProxyDocumentToMarketingSsr(
  url: string,
  method: string,
  accept: string,
): boolean {
  if (shouldBypassMarketingSsrProxy(url)) return false;
  // 认证页 / 店面的表单是真 POST，开发态也得代理过去
  if (isSiteSsrExceptionPath(pathOnly(url))) return true;
  if (method !== "GET" && method !== "HEAD") return false;
  return (
    url === "/sitemap.xml" ||
    url === "/robots.txt" ||
    url === "/llms.txt" ||
    url === "/site.webmanifest" ||
    accept.includes("text/html")
  );
}
