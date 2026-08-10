/**
 * 「我的账户」面板的样式 = 认证卡那一套 + 这一页多出来的三样东西。
 *
 * 直接把 `MEMBER_AUTH_CSS` 拼在前面，而不是让账户页去「蹭」登录页注册的那份：SSR
 * 只发本页用到的段的 CSS（`loadMarketingSiteCssFor`），而账户页上没有登录表单段——
 * 蹭来的样式在那一页根本不会被发出去，卡就裸了。
 */

import { MEMBER_AUTH_CSS } from "./member-auth-css.js";

export const MEMBER_ACCOUNT_CSS = `${MEMBER_AUTH_CSS}
/* 账户页比登录卡略宽：两块功能区并排读得开，仍保持单列居中 */
.member-auth-card.member-account-card {
  max-width: 34rem;
}
/* 资料 / 改密码各自一块——标题 + 说明 + 表单，不再像两张表硬摞 */
.member-account-block {
  padding: 1.25rem 1.375rem;
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + .125rem);
  background: color-mix(in srgb, var(--muted-bg) 55%, var(--surface));
}
.member-account-block + .member-account-block {
  margin-top: .875rem;
}
.member-account-block-head {
  margin-bottom: 1rem;
}
.member-account-block-title {
  margin: 0;
  font-size: .9375rem;
  font-weight: 600;
  line-height: 1.35;
}
.member-account-block-desc {
  margin: .25rem 0 0;
  font-size: .8125rem;
  line-height: 1.45;
  color: var(--muted-fg);
}
.member-auth-card.member-account-card.is-plain .member-account-block {
  background: var(--muted-bg);
}
.member-account-note {
  margin: 0;
  font-size: .8125rem;
  color: var(--muted-fg);
}
.member-account-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: .375rem 1rem;
  margin: .25rem 0 0;
  padding-top: .875rem;
  border-top: 1px solid var(--border);
  font-size: .875rem;
}
.member-account-meta dt {
  color: var(--muted-fg);
}
.member-account-meta dd {
  margin: 0;
  text-align: right;
}
/* 退出登录与上面的表单之间要有一道真正的距离：它不是「再填一栏」，是离开 */
.member-account-logout {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--border);
}
.member-account-logout button {
  width: 100%;
  justify-content: center;
}
/* 提示直接坐在卡里（不像登录页那样在表单的 grid 里），得自己撑开与下面表单的距离 */
.member-auth-card > .member-auth-error,
.member-auth-notice {
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--fg);
  font-size: .875rem;
  padding: .5rem .75rem;
  margin: 0 0 1rem;
}
`;
