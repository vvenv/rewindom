/**
 * `/20260826` —— 回看那一天。
 *
 * 为什么是 path handler 而不是 CMS 页：这是**按日期生成的无数个地址**，不可能
 * 给每一天建一张页。handler 在查 `MarketingPage` 之前被问到，匹配的是剥掉 locale
 * 前缀后的逻辑路径，所以 `/en/20260826` 与 `/20260826` 同一条。
 *
 * 渲染的就是首页那张 CMS 页，只是把日期塞进 `query.d` —— 段的 context provider
 * 读的正是这个。于是「今天」和「回看」共用同一套版式，租户在编辑器里怎么摆的
 * 就怎么显示，不需要另建一张模板页。
 */
import { registerSitePathHandler } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

import { THING_ENTITLEMENT } from "../../shared/entitlements.js";
import { dayPathToDateKey } from "../../shared/useless-section-context.js";

import { renderUselessPage } from "./render-page.js";

/** 在模块 `onBoot` 里调。 */
export function registerUselessDayPath(): void {
  registerSitePathHandler({
    // 未开通 useless 的站点当没匹配——`/20260826` 可以是它自己的一张普通页
    entitlement: THING_ENTITLEMENT.key,
    match: (path) => dayPathToDateKey(path) !== null,
    render: async (input) => {
      const dateKey = dayPathToDateKey(input.path);
      if (!dateKey) return null;

      return renderUselessPage({
        tenantId: input.tenantId,
        tenantSlug: input.tenantSlug,
        origin: input.origin,
        locale: input.locale,
        path: input.path,
        // 这一行就是全部机关：段的 provider 读 `query.d`
        query: { d: dateKey },
        accountEntryHtml: input.accountEntryHtml,
        cookies: input.cookies,
        homePath: input.homePath,
        homeLayoutKey: input.homeLayoutKey,
      });
    },
  });
}
