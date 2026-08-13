/**
 * 会员页头菜单的**可贡献链接**，以及自助页之间的**互链**。
 *
 * 账户入口（登录 / 头像菜单）由 site-member 拥有；订阅等依赖方要在菜单里挂入口时，
 * 往这里登记，而不是改 site-member 的 HTML、也不要在 marketing 的 enhance 里写死路径。
 *
 * 两份清单：
 * - **菜单贡献**（`listMemberMenuLinks`）：插在「账户」与「退出」之间——账户本体不进这里
 * - **自助页互链**（`listMemberSiblingLinks`）：「我的账户」+ 全部贡献项；当前页把自己剔掉，
 *   账户 ↔ 订阅才对称，不会在订阅页上只剩单向入口
 */

import { MEMBER_ACCOUNT_PATH } from "./member-account-section.js";

import type { AppLocale } from "@rewindom/shared";

export interface MemberMenuLink {
  /** 稳定 id；同 id 再登记为幂等覆盖。 */
  id: string;
  href: string;
  /** SSR / enhance 用（公开站不走 i18next）。 */
  labels: Record<AppLocale, string>;
  /**
   * React 预览用的 i18n key（可带命名空间，如 `site-billing:entry.billing`）。
   * 不填则回落 `labels`。
   */
  label_key?: string;
  /** 越小越靠前；默认 100。账户本体链接由 site-member 自己画，不进这份清单。 */
  order?: number;
}

/** 自助页互链里的「我的账户」——永远在第一位，不进菜单贡献清单。 */
const ACCOUNT_SIBLING_LINK: MemberMenuLink = {
  id: "account",
  href: MEMBER_ACCOUNT_PATH,
  labels: {
    "zh-CN": "我的账户",
    en: "My account",
  },
  label_key: "site-member:entry.account",
  order: 0,
};

const LINKS = new Map<string, MemberMenuLink>();

/** 登记一条菜单链接（幂等覆盖）。 */
export function registerMemberMenuLink(link: MemberMenuLink): void {
  LINKS.set(link.id, link);
}

/** 仅供测试。 */
export function resetMemberMenuLinks(): void {
  LINKS.clear();
}

function byOrderThenId(a: MemberMenuLink, b: MemberMenuLink): number {
  const order = (a.order ?? 100) - (b.order ?? 100);
  return order !== 0 ? order : a.id.localeCompare(b.id);
}

/** 登记顺序按 `order` 再按 id，稳定可测。 */
export function listMemberMenuLinks(): MemberMenuLink[] {
  return [...LINKS.values()].sort(byOrderThenId);
}

/**
 * 自助页之间的互链：账户 + 贡献项。
 *
 * `excludeHref` 剔掉当前页自己——人已经在订阅页上，再给一条「我的订阅」没意义。
 */
export function listMemberSiblingLinks(options?: {
  excludeHref?: string;
}): MemberMenuLink[] {
  const exclude = options?.excludeHref;
  return [ACCOUNT_SIBLING_LINK, ...listMemberMenuLinks()]
    .filter((link) => link.href !== exclude)
    .sort(byOrderThenId);
}

export function memberMenuLinkLabel(
  link: MemberMenuLink,
  locale: AppLocale,
): string {
  return link.labels[locale] ?? link.labels["zh-CN"] ?? link.id;
}

/** 当前语言下的 `{ href, label }`，给 HTML / enhance JSON 用。 */
export function memberMenuLinksForLocale(
  locale: AppLocale,
): Array<{ href: string; label: string }> {
  return listMemberMenuLinks().map((link) => ({
    href: link.href,
    label: memberMenuLinkLabel(link, locale),
  }));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

/** 菜单里账户链接之后、退出之前的那几条 `<a>`。 */
export function renderMemberMenuLinksHtml(locale: AppLocale): string {
  return memberMenuLinksForLocale(locale)
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`,
    )
    .join("\n    ");
}

/**
 * 埋在账户入口旁的 JSON：访客态 SSR 只有登录钮时，site-enhance 升级成菜单仍能
 * 读到贡献链接。id 固定，enhance 按这个找。
 */
export function renderMemberMenuLinksJsonScript(locale: AppLocale): string {
  const payload = JSON.stringify(memberMenuLinksForLocale(locale));
  return `<script type="application/json" id="member-menu-links">${payload}</script>`;
}

/**
 * 自助页卡内互链（账户 ↔ 订阅…）。
 *
 * 传入当前页 `excludeHref`，避免「你已经在这儿了」再链一次。
 */
export function renderMemberSiblingLinksHtml(
  locale: AppLocale,
  options: { excludeHref: string },
): string {
  const links = listMemberSiblingLinks(options);
  if (links.length === 0) return "";
  return `<nav class="member-account-links" aria-label="${escapeHtml(
    locale === "en" ? "Account links" : "账户入口",
  )}">${links
    .map(
      (link) =>
        `<a href="${escapeHtml(link.href)}">${escapeHtml(
          memberMenuLinkLabel(link, locale),
        )}</a>`,
    )
    .join("")}</nav>`;
}
