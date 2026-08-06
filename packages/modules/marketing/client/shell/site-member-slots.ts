import type { ReactNode } from "react";

import { createComponentSlot } from "@be-water/client-kit";

import type { PublicMarketingPage } from "../../shared/site-cms.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 站点会员相关的注入点，放在 marketing（消费方）一侧。
 *
 * marketing 因此不必 import `site-member`：页头入口与受限内容提示都由
 * site-member 通过 `client.shell.publicProviders` 填进来，没填就什么都不渲染
 *（未开通会员的站点正是这种状态）。
 */

/** 页头的会员入口（未登录显示「登录」，已登录显示「我的账户」）。 */
export const siteMemberEntrySlot = createComponentSlot<{
  className?: string;
}>("SiteMemberEntrySlot");

/** `visibility=members` 页面的登录提示区。 */
export const siteMemberGateSlot = createComponentSlot<{
  /** 登录后回跳的站内路径。 */
  redirectTo: string;
}>("SiteMemberGateSlot");

/**
 * 会员专属页的会话感知加载器。
 *
 * marketing 只负责公开摘要与最终渲染；是否登录、如何带会员 token 拉正文
 * 都在 site-member 里完成，避免 marketing → site-member 的静态依赖。
 */
export const siteMemberGatedPageSlot = createComponentSlot<{
  logicalPath: string;
  locale?: AppLocale;
  redirectTo: string;
  summary: PublicMarketingPage;
  /** 已拿到完整正文时由 marketing 渲染页面。 */
  renderReady: (page: PublicMarketingPage) => ReactNode;
  /** 未登录 / 加载中：把门控或占位塞进站点壳。 */
  renderShell: (body: ReactNode) => ReactNode;
}>("SiteMemberGatedPageSlot");
