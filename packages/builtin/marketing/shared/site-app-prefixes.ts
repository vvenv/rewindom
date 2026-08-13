/**
 * 应用区路径前缀与 SSR 例外（nginx / Vite 代理 / Marketing SSR 共用）。
 *
 * 本文件**不得** import `@rewindom/shared`：`vite.config.ts` 会加载
 * `isSiteSsrExceptionPath`，Vite 把 workspace 包交给 Node 原生 ESM 后，
 * shared 的 `./foo.js` → `foo.ts` 约定无法解析，dev server 起不来。
 */

/**
 * 不属于官网内容、因而不加 locale 前缀的一级路径。
 *
 * 与 `server/ssr.routes.ts` 的 SPA 兜底、`RESERVED_PAGE_SLUGS` 同源：
 * 这三处说的是同一件事——这些一级段不归租户 CMS 管。
 */
export const SITE_APP_PREFIXES = [
  /*
   * 应用区一级路径：这些不是租户 CMS 的页面，SSR 认出后交回 SPA。
   *
   * **租户工作台的路由全部收在 `/app/*` 之下**，所以这里只需要一个 `app`——
   * 新增业务模块不必再回来加一行。以前每个模块各占一个顶层路径（`/notes`、
   * `/site`…），这张表就得跟着长，而它在 nginx location 与 vite dev 代理里
   * 还各有一份副本：`/site`、`/dashboard`、`/audit-logs` 就这么漏掉过，
   * 在绑定域上一直是 404。顺带也把这些顶层 slug 还给了租户站点。
   */
  "app",
  // 工作台登录/注册（GuestOnlyRoute）
  "login",
  "register",
  // 工作台 OAuth 前端落地页（/auth/oauth/callback）；漏掉会被 Marketing SSR 当成 CMS 404
  "auth",
  // 站点会员的登录/注册/我的账户；不加进来 SSR 会把 /member/login 当 CMS 页面找
  "member",
  // 店面 SSR（/shop、/shop/:slug）；nginx / vite 再以 SSR 例外前缀打回 Fastify
  "shop",
  // 平台控制台
  "platform",
  // 非文档路径，由各自的 location / 中间件处理
  "api",
  "assets",
  "health",
] as const;

/**
 * 应用区前缀下的**例外**：这些具体路径由服务端渲染，不交回 SPA。
 *
 * 会员的登录 / 注册 / 我的账户都是租户可排版的模板页（版式在 Theme Editor 里排，
 * 表单由代码渲染），所以它们必须走 Fastify SSR；`/member/*` 下的其余页面
 *（`/member/oauth/callback`）仍是 SPA。
 *
 * 与 `SITE_APP_PREFIXES` 一样，这份表在 nginx location 与 vite dev 代理里各有一份副本，
 * 由 `nginx-spa-prefixes.test.ts` 盯着三处对齐——漏掉一处的后果是登录页在那个环境下
 * 打开的是 SPA 的 404（SPA 上已经没有这几条路由了）。
 *
 * marketing 在这里写死 `/member/...` 是刻意的：`enhance/account.ts` 的登录链、
 * SSR 的不可用页也都写着同一个地址。这是**部署拓扑**，不是模块依赖——运行期的注册表
 * （`page-templates.ts`）进不了 nginx 配置。
 */
export const SITE_SSR_EXCEPTION_PATHS = [
  "/member/login",
  "/member/register",
  "/member/account",
  "/member/billing",
  "/member/orders",
] as const;

/** 整段前缀走 SSR 的例外（店面 `/shop` 与 `/shop/:slug`）。 */
export const SITE_SSR_PREFIX_EXCEPTIONS = ["/shop"] as const;

const SSR_EXCEPTION_SET = new Set<string>(SITE_SSR_EXCEPTION_PATHS);

export function normalizeSitePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/u, "");
  if (trimmed === "") return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/** 这条路径虽然落在应用区前缀下，但归服务端渲染。 */
export function isSiteSsrExceptionPath(path: string): boolean {
  const normalized = normalizeSitePath(path.split(/[?#]/u)[0] ?? path);
  if (SSR_EXCEPTION_SET.has(normalized)) return true;
  return SITE_SSR_PREFIX_EXCEPTIONS.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}
