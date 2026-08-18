/**
 * 业务模块贡献的**公开路径处理器**。
 *
 * marketing SSR 在 locale 剥离之后、查 `MarketingPage` 之前问这张表。文档库的
 * `/docs` 走这里，而不是写死在 `renderPath` 里——marketing 不该认识「文档」。
 *
 * 匹配的是**去掉 locale 前缀后的路径**（`/docs`、`/docs/foo`），所以
 * `/en/docs` 与 `/docs` 同一条 handler。
 *
 * 声明了 `entitlement` 且该租户未开通 → 当没匹配（路径可以变成普通页面）。
 *
 * 模块把枢纽设为首页、公开 URL 收到站点根时：前缀 handler 仍接旧地址并
 * `canonicalRedirect` 301；根上的 `/:slug` 不能抢在 CMS 前面，走
 * `registerSitePathFallback`（查页面之后、重定向前）。
 */

import type { AppLocale } from "@rewindom/shared";

export interface SitePathHandlerInput {
  tenantId: string;
  tenantSlug: string;
  origin: string;
  /** locale 剥离后的逻辑路径，如 `/docs/install`。 */
  path: string;
  /**
   * 实际对外的地址。把 `/events` 设为首页时，逻辑 path 仍是 `/events`（取数 / 版式），
   * 但 canonical / 语言切换器要指向 `/`。未设则与 `path` 相同。
   */
  servedPath?: string;
  /**
   * 已发布站点的 `home_path`。模块据此决定公开前缀是否收到根上。
   * SSR 总会带上；测试或其它调用方漏传按未设首页算。
   */
  homePath?: string;
  /**
   * 当前页语言。SSR 在无前缀时已填成站点主语言；`null` 只应出现在测试漏传。
   * 渲染库存文案用这个值。站内重定向的 Location 仍用 URL 上剥出来的 locale
   *（`null` = 不带前缀），不要把已解析的主语言交给 `localizeRedirectLocation`。
   */
  locale: AppLocale | null;

  enabledEntitlements: ReadonlySet<string>;
  accountEntryHtml: string;
  cookies?: { get(name: string): string | undefined };
  query: Record<string, string>;
}

export interface SitePathHandler {
  /**
   * 这条路径是不是本 handler 的。只看逻辑路径，不管 entitlement
   *（开通与否由 `matchSitePathHandler` 另判）。
   */
  match: (path: string) => boolean;
  /** 未开通则当作没匹配，让路径回落到普通页面查找。 */
  entitlement?: string;
  /**
   * 若返回路径且与 `servedPath` 不同，SSR 在渲染前发 301。
   * 用于「把本模块设为首页后，旧前缀收到根上」。
   */
  canonicalRedirect?: (input: SitePathHandlerInput) => string | null;
  /**
   * 渲染 HTML；`null` 表示这个前缀下没有内容（文档不存在）→ 走 404。
   */
  render: (input: SitePathHandlerInput) => Promise<string | null>;
}

/**
 * CMS 未命中后再问。`match` 为真也不等于这是你的页：`render` 返回 `null`
 * 时 SSR 继续查重定向 / 404，不会直接 404。
 *
 * 给「首页收到根上」的模块用：`/:slug` 必须让已发布的 CMS 页先赢。
 */
export interface SitePathFallback {
  entitlement?: string;
  match: (path: string, ctx: { homePath: string }) => boolean;
  render: (input: SitePathHandlerInput) => Promise<string | null>;
}

const HANDLERS: SitePathHandler[] = [];
const FALLBACKS: SitePathFallback[] = [];

export function registerSitePathHandler(handler: SitePathHandler): void {
  if (HANDLERS.includes(handler)) return;
  HANDLERS.push(handler);
}

export function registerSitePathFallback(fallback: SitePathFallback): void {
  if (FALLBACKS.includes(fallback)) return;
  FALLBACKS.push(fallback);
}

export function resetSitePathHandlers(): void {
  HANDLERS.length = 0;
  FALLBACKS.length = 0;
}

function entitlementOk(
  entitlement: string | undefined,
  enabled: ReadonlySet<string>,
): boolean {
  return !entitlement || enabled.has(entitlement);
}

/**
 * 找第一条匹配且对该租户开通的 handler。没有就 `undefined`，SSR 继续查页面。
 */
export function matchSitePathHandler(
  path: string,
  enabledEntitlements: ReadonlySet<string>,
): SitePathHandler | undefined {
  return HANDLERS.find((handler) => {
    if (!handler.match(path)) return false;
    return entitlementOk(handler.entitlement, enabledEntitlements);
  });
}

/**
 * CMS 未命中后找 fallback。没有或 `render` 返回 null → SSR 继续重定向 / 404。
 */
export function matchSitePathFallback(
  path: string,
  enabledEntitlements: ReadonlySet<string>,
  ctx: { homePath: string },
): SitePathFallback | undefined {
  return FALLBACKS.find((fallback) => {
    if (!fallback.match(path, ctx)) return false;
    return entitlementOk(fallback.entitlement, enabledEntitlements);
  });
}
