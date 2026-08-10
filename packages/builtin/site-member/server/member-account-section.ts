/**
 * 「我的账户」面板段的 SSR 渲染。
 *
 * 一张卡里三张**真表单**：改昵称、改密码、退出登录，各自 POST 回本页，靠隐藏字段
 * `intent` 分流（见 `member-account.ssr.ts`）。没有 JS 也全都做得到——这一页是会员的
 * 自助入口，与 `/member/login` 同一个理由。
 *
 * 结构与编辑器预览 `MemberAccountPanelSection.tsx` 同构，
 * `MemberAccountPanelSection.test.tsx` 守着这条对齐。
 */

import { escapeHtml } from "../../marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "../../marketing/shared/section-schema.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import { MEMBER_ACCOUNT_CSS } from "../shared/member-account-css.js";
import {
  memberAccountPanelSection,
  readMemberAccountContext,
} from "../shared/member-account-section.js";
import { memberCardClass } from "../shared/member-page-settings.js";

function fieldHtml(input: {
  id: string;
  name?: string;
  type: string;
  label: string;
  autocomplete: string;
  required: boolean;
  value?: string;
  readonly?: boolean;
  note?: string;
}): string {
  const value = input.value ? ` value="${escapeHtml(input.value)}"` : "";
  const name = input.name ? ` name="${escapeHtml(input.name)}"` : "";
  const note = input.note
    ? `<p class="member-account-note">${escapeHtml(input.note)}</p>`
    : "";
  return `<div class="member-auth-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <input id="${escapeHtml(input.id)}"${name} type="${escapeHtml(input.type)}" autocomplete="${escapeHtml(input.autocomplete)}"${input.required ? " required" : ""}${input.readonly ? " readonly" : ""}${value} />
  ${note}
</div>`;
}

/**
 * 注册时间 / 上次登录。
 *
 * 是 `<dl>` 而不是两行 `<p>`：这是成对的名值，读屏软件按对念出来才对得上。
 */
function metaHtml(
  createdLabel: string,
  createdAt: string,
  lastLoginLabel: string,
  lastLoginAt: string,
): string {
  return `<dl class="member-account-meta">
  <dt>${escapeHtml(createdLabel)}</dt><dd>${escapeHtml(createdAt)}</dd>
  <dt>${escapeHtml(lastLoginLabel)}</dt><dd>${escapeHtml(lastLoginAt)}</dd>
</dl>`;
}

function blockHeadHtml(title: string, desc: string): string {
  if (!title && !desc) return "";
  return `<div class="member-account-block-head">${
    title ? `<h3 class="member-account-block-title">${escapeHtml(title)}</h3>` : ""
  }${desc ? `<p class="member-account-block-desc">${escapeHtml(desc)}</p>` : ""}</div>`;
}

function blockHtml(title: string, desc: string, body: string): string {
  return `<section class="member-account-block">${blockHeadHtml(title, desc)}${body}</section>`;
}

const renderAccountPanelHtml: SectionHtmlRenderer = (section, ctx) => {
  const account = readMemberAccountContext(ctx);
  /*
   * 拿不到上下文 = 这一段被摆到了它不该在的地方。什么都不渲染，与「段放错了地方」
   * 同一个观感——绝不能吐一个 action 为空的账户面板。
   */
  if (!account) return "";

  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const head =
    heading || subheading
      ? `<div class="member-auth-head">${
          heading ? `<h2>${escapeHtml(heading)}</h2>` : ""
        }${subheading ? `<p>${escapeHtml(subheading)}</p>` : ""}</div>`
      : "";

  const message = account.error
    ? `<p class="member-auth-error" role="alert">${escapeHtml(account.error)}</p>`
    : account.notice
      ? `<p class="member-auth-notice" role="status">${escapeHtml(account.notice)}</p>`
      : "";

  const profile = `<form class="member-auth" method="post" action="${escapeHtml(account.action)}" data-member-account="profile">
  <input type="hidden" name="intent" value="profile" />
  ${fieldHtml({
    id: "member-account-email",
    type: "email",
    label: settingText(s, "email_label"),
    autocomplete: "email",
    required: false,
    value: account.email,
    readonly: true,
    note: settingText(s, "email_note"),
  })}
  ${fieldHtml({
    id: "member-account-name",
    name: "display_name",
    type: "text",
    label: settingText(s, "display_name_label"),
    autocomplete: "nickname",
    required: true,
    value: account.display_name,
  })}
  ${
    settingBool(s, "show_meta")
      ? metaHtml(
          settingText(s, "created_label"),
          account.created_at,
          settingText(s, "last_login_label"),
          account.last_login_at,
        )
      : ""
  }
  <button class="btn member-auth-submit" type="submit">${escapeHtml(settingText(s, "save_label"))}</button>
</form>`;

  const password = settingBool(s, "show_password")
    ? `<form class="member-auth" method="post" action="${escapeHtml(account.action)}" data-member-account="password">
  <input type="hidden" name="intent" value="password" />
  ${fieldHtml({
    id: "member-old-password",
    name: "old_password",
    type: "password",
    label: settingText(s, "old_password_label"),
    autocomplete: "current-password",
    required: true,
  })}
  ${fieldHtml({
    id: "member-new-password",
    name: "new_password",
    type: "password",
    label: settingText(s, "new_password_label"),
    autocomplete: "new-password",
    required: true,
  })}
  ${fieldHtml({
    id: "member-confirm-password",
    name: "confirm_password",
    type: "password",
    label: settingText(s, "confirm_password_label"),
    autocomplete: "new-password",
    required: true,
  })}
  <button class="btn member-auth-submit" type="submit">${escapeHtml(settingText(s, "password_submit_label"))}</button>
</form>`
    : "";

  const logout = `<form class="member-account-logout" method="post" action="${escapeHtml(account.action)}" data-member-account="logout">
  <input type="hidden" name="intent" value="logout" />
  <button class="btn btn-secondary" type="submit">${escapeHtml(settingText(s, "logout_label"))}</button>
</form>`;

  /*
   * 资料与改密码各自成块（标题 + 说明 + 表单），而不是两张表硬摞在一张卡里：
   * 摞着的时候「保存」下面紧跟着「当前密码」，读起来像是同一张表的下半截。
   */
  const blocks = `${blockHtml(
    settingText(s, "profile_title"),
    settingText(s, "profile_desc"),
    profile,
  )}${
    password
      ? blockHtml(
          settingText(s, "password_divider"),
          settingText(s, "password_desc"),
          password,
        )
      : ""
  }`;

  return `<div class="${memberCardClass(s, "member-account-card")}">${head}${message}${blocks}${logout}</div>`;
};

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的注册表。 */
export function registerMemberAccountSection(): void {
  registerSiteSectionHtml(memberAccountPanelSection, renderAccountPanelHtml, {
    css: MEMBER_ACCOUNT_CSS,
  });
}
