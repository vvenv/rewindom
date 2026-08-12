/**
 * 「会员专属内容」段的 SSR 渲染。
 *
 * **首屏永远只画锁定态**：会员 token 在 localStorage，不随 HTML 请求发送，服务端
 * 无从知道访客是否已登录（同 `site-account-entry.ts` 的理由）。已登录的正文由
 * site-enhance 拉 `/api/member/me` 确认会话后就地替换。
 *
 * 正文**不进 HTML**——这一段的全部意义就是「没登录看不到」，把它渲染进首屏再用
 * JS 藏起来，等于把内容白送给任何看源码的人和爬虫。
 */

import { escapeHtml } from "../../marketing/shared/html.js";
import { settingText } from "../../marketing/shared/section-schema.js";
import {
  registerSiteSectionHtml,
  type SectionHtmlRenderer,
} from "../../marketing/shared/sections/html.js";
import { memberGateSection } from "../shared/member-gate-section.js";
import { MEMBER_GATE_CSS } from "../shared/site-css.generated.js";

const LOCK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

const renderMemberGateHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const body = settingText(s, "locked_body");
  /*
   * `data-member-gate` 是给 site-enhance 认的挂点；正文另走
   * `/api/site/content/page`，与 `requires_member` 整页门控同一条路径。
   */
  return `<div class="member-gate" data-member-gate="${escapeHtml(section.id)}">
  <span class="member-gate-icon" aria-hidden="true">${LOCK_ICON}</span>
  <p class="title">${escapeHtml(settingText(s, "locked_headline"))}</p>
  ${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}
  <p><a class="btn" href="/member/login">${escapeHtml(settingText(s, "login_label"))}</a></p>
</div>`;
};

/** 在模块 `onBoot` 里调；顺手把定义也登记进 marketing 的注册表。 */
export function registerMemberGateSection(): void {
  registerSiteSectionHtml(memberGateSection, renderMemberGateHtml, {
    css: MEMBER_GATE_CSS,
  });
}
