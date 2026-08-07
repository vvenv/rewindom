import { registerSiteAccountEntry } from "../../marketing/server/site-account-entry.js";
import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";

import type { SiteMemberSsrProfile } from "../../marketing/server/site-member-ssr-session.js";
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

const ACCOUNT_LABEL: Record<AppLocale, string> = {
  "zh-CN": "账户",
  en: "Account",
};

const LOGOUT_LABEL: Record<AppLocale, string> = {
  "zh-CN": "退出登录",
  en: "Log out",
};

const MENU_LABEL: Record<AppLocale, string> = {
  "zh-CN": "账户菜单",
  en: "Account",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function displayName(member: SiteMemberSsrProfile): string {
  const name = member.display_name?.trim();
  if (name) return name;
  return member.email.trim();
}

function initials(member: SiteMemberSsrProfile): string {
  const source = displayName(member);
  if (!source) return "";
  const words = source.split(/\s+/u).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => [...word][0] ?? "")
      .join("")
      .toUpperCase();
  }
  return [...(words[0] ?? "")].slice(0, 2).join("");
}

/** 与 `SiteMemberEntry` 未登录态同一份 class（`btn btn-ghost member-entry`）与图标。 */
function loginEntryHtml(locale: AppLocale): string {
  const label = LOGIN_LABEL[locale] ?? LOGIN_LABEL["zh-CN"];
  return `<a class="btn btn-ghost member-entry" href="/member/login"><svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${label}</a>`;
}

/** 与 site-enhance `menuHtml` 同构，便于首屏已登录与客户端升级一致。 */
function memberMenuHtml(
  locale: AppLocale,
  member: SiteMemberSsrProfile,
): string {
  const name = escapeHtml(displayName(member));
  const email = escapeHtml(member.email);
  const avatar = escapeHtml(initials(member));
  const showEmail = member.email && member.email !== displayName(member);
  const accountLabel = ACCOUNT_LABEL[locale] ?? ACCOUNT_LABEL["zh-CN"];
  const logoutLabel = LOGOUT_LABEL[locale] ?? LOGOUT_LABEL["zh-CN"];
  const menuLabel = MENU_LABEL[locale] ?? MENU_LABEL["zh-CN"];
  return `<details class="member-menu">
  <summary aria-label="${menuLabel}">
    <span class="member-avatar" aria-hidden>${avatar}</span>
    <span class="member-name">${name}</span>
  </summary>
  <div class="member-menu-panel">
    <div class="member-menu-label">
      <span class="member-avatar" aria-hidden>${avatar}</span>
      <div>
        <strong>${name}</strong>
        ${showEmail ? `<span class="muted">${email}</span>` : ""}
      </div>
    </div>
    <a href="/member/account">${accountLabel}</a>
    <button type="button" data-member-logout>${logoutLabel}</button>
  </div>
</details>`;
}

/**
 * 把账户入口填进 marketing 的服务端注入点。
 *
 * 方向与 client 侧一致：slot 定义在 marketing（消费方），site-member 来填。
 * 站点没开通会员时返回 `available: false`——编辑器据此把「账户入口」开关置灰，
 * 预览也不画那枚按钮，与线上保持同一口径。
 */
export function registerSiteMemberAccountEntry(): void {
  registerSiteAccountEntry(async ({ tenantId, locale, member }) => {
    const enabled = await isTenantModuleEnabled(
      tenantId,
      TENANT_SITE_MEMBER_ENTITLEMENT.key,
    );
    if (!enabled) return { available: false, html: "" };
    if (member) {
      return { available: true, html: memberMenuHtml(locale, member) };
    }
    return { available: true, html: loginEntryHtml(locale) };
  });
}
