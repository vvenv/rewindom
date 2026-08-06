import { registerSiteAccountEntry } from "../../marketing/server/site-account-entry.js";
import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";


import type { AppLocale } from "@be-water/shared";

/**
 * 页头账户入口的未登录态文案。
 *
 * 与客户端 `client/locales/*.json` 的 `entry.login` 保持一致；这里单独放一份是因为
 * SSR 不加载前端的 i18n 资源，而这一个词不值得为它引一整套加载器进来。
 */
const LOGIN_LABEL: Record<AppLocale, string> = {
  "zh-CN": "登录",
  en: "Sign in",
};

/** 与 `SiteMemberEntry` 未登录态同一份 class（`btn btn-ghost member-entry`）与图标。 */
function loginEntryHtml(locale: AppLocale): string {
  const label = LOGIN_LABEL[locale] ?? LOGIN_LABEL["zh-CN"];
  return `<a class="btn btn-ghost member-entry" href="/member/login"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${label}</a>`;
}

/**
 * 把账户入口填进 marketing 的服务端注入点。
 *
 * 方向与 client 侧一致：slot 定义在 marketing（消费方），site-member 来填。
 * 站点没开通会员时返回 `available: false`——编辑器据此把「账户入口」开关置灰，
 * 预览也不画那枚按钮，与线上保持同一口径。
 */
export function registerSiteMemberAccountEntry(): void {
  registerSiteAccountEntry(async ({ tenantId, locale }) => {
    const enabled = await isTenantModuleEnabled(
      tenantId,
      TENANT_SITE_MEMBER_ENTITLEMENT.key,
    );
    if (!enabled) return { available: false, html: "" };
    return { available: true, html: loginEntryHtml(locale) };
  });
}
