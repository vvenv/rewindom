/**
 * 「我的账户」面板段的 SSR 渲染。
 *
 * 一张卡里三张**真表单**：改昵称、改密码、退出登录，各自 POST 回本页，靠隐藏字段
 * `intent` 分流（见 `member-account.ssr.ts`）。没有 JS 也全都做得到——这一页是会员的
 * 自助入口，与 `/member/login` 同一个理由。
 *
 * 卡里的顺序是**身份 → 只读事实 → 能改的东西**：
 *
 * 1. 身份条（头像 / 昵称 / 邮箱 / 退出）——你是谁，以及离开的出口；
 * 2. 注册时间与上次登录——两枚只读的小方块，与下面的表单划清界限；
 * 3. 「账户资料」块——这一页唯一一枚实心按钮；
 * 4. 「修改密码」抽屉——平时收着，`<details>` 原生开合，不吃 JS。
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
import {
  memberAccountPanelSection,
  readMemberAccountContext,
  type MemberAccountRenderContext,
} from "../shared/member-account-section.js";
import {
  memberDisplayName,
  memberInitials,
} from "../shared/member-identity.js";
import { renderMemberAccountLinksHtml } from "../shared/member-menu-links.js";
import { memberCardClass } from "../shared/member-page-settings.js";
import { MEMBER_ACCOUNT_CSS } from "../shared/site-css.generated.js";

import type { AppLocale } from "@be-water/shared";

function fieldHtml(input: {
  id: string;
  name: string;
  type: string;
  label: string;
  autocomplete: string;
  value?: string;
}): string {
  const value = input.value ? ` value="${escapeHtml(input.value)}"` : "";
  return `<div class="member-auth-field">
  <label for="${escapeHtml(input.id)}">${escapeHtml(input.label)}</label>
  <input id="${escapeHtml(input.id)}" name="${escapeHtml(input.name)}" type="${escapeHtml(input.type)}" autocomplete="${escapeHtml(input.autocomplete)}" required${value} />
</div>`;
}

/** 表单落点：靠右一枚按钮，两张表单共用（见 `.member-account-actions` 的注释）。 */
function actionsHtml(label: string): string {
  return `<div class="member-account-actions">
  <button class="btn" type="submit">${escapeHtml(label)}</button>
</div>`;
}

/**
 * 身份条：头像 + 昵称 + 邮箱 + 退出。
 *
 * 邮箱以前是个 `readonly` 的输入框，配一句「邮箱不可修改」。长得能改却不让改，是这
 * 张卡上最费解的一格；改成一行文字之后那句说明也就不用写了。
 */
function identityHtml(
  account: MemberAccountRenderContext,
  logoutLabel: string,
): string {
  const name = memberDisplayName(account);
  // 没填昵称的会员，名字位上顶的就是邮箱——底下再重复一遍没有意义
  const email =
    account.email && account.email !== name
      ? `<p class="member-account-who-email">${escapeHtml(account.email)}</p>`
      : "";
  return `<div class="member-account-identity">
  <span class="member-account-avatar" aria-hidden="true">${escapeHtml(memberInitials(account))}</span>
  <div class="member-account-who">
    <p class="member-account-who-name">${escapeHtml(name)}</p>
    ${email}
  </div>
  <form class="member-account-logout" method="post" action="${escapeHtml(account.action)}" data-member-account="logout">
    <input type="hidden" name="intent" value="logout" />
    <button class="btn btn-ghost" type="submit">${escapeHtml(logoutLabel)}</button>
  </form>
</div>`;
}

/**
 * 注册时间 / 上次登录。
 *
 * 是 `<dl>` 而不是两行 `<p>`：这是成对的名值，读屏软件按对念出来才对得上。
 * 每对再包一层 `<div>`（HTML5 允许），才排得成两枚并排的方块。
 */
function metaHtml(
  createdLabel: string,
  createdAt: string,
  lastLoginLabel: string,
  lastLoginAt: string,
): string {
  return `<dl class="member-account-meta">
  <div><dt>${escapeHtml(createdLabel)}</dt><dd>${escapeHtml(createdAt)}</dd></div>
  <div><dt>${escapeHtml(lastLoginLabel)}</dt><dd>${escapeHtml(lastLoginAt)}</dd></div>
</dl>`;
}

function blockHeadHtml(title: string, desc: string): string {
  if (!title && !desc) return "";
  return `<div class="member-account-block-head">${
    title ? `<h3 class="member-account-block-title">${escapeHtml(title)}</h3>` : ""
  }${desc ? `<p class="member-account-block-desc">${escapeHtml(desc)}</p>` : ""}</div>`;
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

  const identity = identityHtml(account, settingText(s, "logout_label"));
  const locale = (ctx.locale ?? ctx.defaultLocale ?? "zh-CN") as AppLocale;
  const links = renderMemberAccountLinksHtml(locale);

  const meta = settingBool(s, "show_meta")
    ? metaHtml(
        settingText(s, "created_label"),
        account.created_at,
        settingText(s, "last_login_label"),
        account.last_login_at,
      )
    : "";

  const profile = `<section class="member-account-block">
  ${blockHeadHtml(settingText(s, "profile_title"), settingText(s, "profile_desc"))}
  <form class="member-auth" method="post" action="${escapeHtml(account.action)}" data-member-account="profile">
    <input type="hidden" name="intent" value="profile" />
    ${fieldHtml({
      id: "member-account-name",
      name: "display_name",
      type: "text",
      label: settingText(s, "display_name_label"),
      autocomplete: "nickname",
      value: account.display_name,
    })}
    ${actionsHtml(settingText(s, "save_label"))}
  </form>
</section>`;

  const passwordDesc = settingText(s, "password_desc");
  const password = settingBool(s, "show_password")
    ? `<details class="member-account-block member-account-disclosure"${
        // 刚在这一块里填错了，就展开着回来——别让人自己去找错在哪
        account.intent === "password" ? " open" : ""
      }>
  <summary class="member-account-summary">
    <span class="member-account-summary-text">
      <span class="member-account-block-title">${escapeHtml(settingText(s, "password_divider"))}</span>
      ${passwordDesc ? `<span class="member-account-block-desc">${escapeHtml(passwordDesc)}</span>` : ""}
    </span>
    <span class="member-account-summary-mark" aria-hidden="true"></span>
  </summary>
  <form class="member-auth" method="post" action="${escapeHtml(account.action)}" data-member-account="password">
    <input type="hidden" name="intent" value="password" />
    ${fieldHtml({
      id: "member-old-password",
      name: "old_password",
      type: "password",
      label: settingText(s, "old_password_label"),
      autocomplete: "current-password",
    })}
    ${fieldHtml({
      id: "member-new-password",
      name: "new_password",
      type: "password",
      label: settingText(s, "new_password_label"),
      autocomplete: "new-password",
    })}
    ${fieldHtml({
      id: "member-confirm-password",
      name: "confirm_password",
      type: "password",
      label: settingText(s, "confirm_password_label"),
      autocomplete: "new-password",
    })}
    ${actionsHtml(settingText(s, "password_submit_label"))}
  </form>
</details>`
    : "";

  return `<div class="${memberCardClass(s, "member-account-card")}">${head}${message}${identity}${links}${meta}${profile}${password}</div>`;
};

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的注册表。 */
export function registerMemberAccountSection(): void {
  registerSiteSectionHtml(memberAccountPanelSection, renderAccountPanelHtml, {
    css: MEMBER_ACCOUNT_CSS,
  });
}
