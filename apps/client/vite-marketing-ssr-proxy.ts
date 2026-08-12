/**
 * 应用区一级路径：开发态不代理给 Marketing SSR，交回 Vite SPA。
 * 须与 `SITE_APP_PREFIXES`（`packages/modules/marketing/shared/site-locale.ts`）
 * 及 nginx SPA location 对齐——见 `nginx-spa-prefixes.test.ts`。
 */
const SPA_ROUTE_PREFIXES = [
  // 租户工作台已统一收在 /app/* 之下，所以这里只需要一个 app
  "app",
  "login",
  "register",
  "auth",
  "member",
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

/**
 * 应用区前缀下的**例外**：这几条路径归 Fastify SSR（租户可排版的会员认证页）。
 * 须与 `SITE_SSR_EXCEPTION_PATHS`（marketing/shared/site-locale.ts）及 nginx location 对齐。
 */
const SSR_EXCEPTION_PATHS = [
  "/member/login",
  "/member/register",
  "/member/account",
  "/member/billing",
] as const;

function isSsrExceptionPath(url: string): boolean {
  return (SSR_EXCEPTION_PATHS as readonly string[]).includes(url);
}

export function shouldBypassMarketingSsrProxy(url: string): boolean {
  if (isSsrExceptionPath(url)) return false;
  return SPA_PREFIX_RE.test(url) || VITE_DEV_INTERNAL_RE.test(url);
}

export function shouldProxyDocumentToMarketingSsr(
  url: string,
  method: string,
  accept: string,
): boolean {
  if (shouldBypassMarketingSsrProxy(url)) return false;
  // 认证页的表单是真 POST，开发态也得代理过去，否则本地登录只会打到 Vite 上
  if (isSsrExceptionPath(url)) return true;
  if (method !== "GET" && method !== "HEAD") return false;
  return (
    url === "/sitemap.xml" ||
    url === "/robots.txt" ||
    accept.includes("text/html")
  );
}
