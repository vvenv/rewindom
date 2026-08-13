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
 */

import type { AppLocale } from "@rewindom/shared";

export interface SitePathHandlerInput {
  tenantId: string;
  tenantSlug: string;
  origin: string;
  /** locale 剥离后的逻辑路径，如 `/docs/install`。 */
  path: string;
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
   * 渲染 HTML；`null` 表示这个前缀下没有内容（文档不存在）→ 走 404。
   */
  render: (input: SitePathHandlerInput) => Promise<string | null>;
}

const HANDLERS: SitePathHandler[] = [];

export function registerSitePathHandler(handler: SitePathHandler): void {
  if (HANDLERS.includes(handler)) return;
  HANDLERS.push(handler);
}

export function resetSitePathHandlers(): void {
  HANDLERS.length = 0;
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
    if (
      handler.entitlement &&
      !enabledEntitlements.has(handler.entitlement)
    ) {
      return false;
    }
    return true;
  });
}
