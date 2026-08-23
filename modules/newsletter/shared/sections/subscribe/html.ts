import {
  DEFAULT_DIGEST_CADENCE,
  NEWSLETTER_ALL_LISTS,
} from "../../newsletter.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 订阅段的 SSR。
 *
 * 只出静态结构；提交由 site-enhance 拦截（`POST /api/public/newsletter/subscribe`），
 * 与 site-form 同构。**订阅可以依赖 JS，退订不行**——退订走的是两张真 form 的 SSR 页，
 * 因为读者退不掉订阅就只能点「举报垃圾邮件」，那会烧掉整个发信域的声誉。
 *
 * `data-list-key` 留空是有意义的值，表示「本站全部可订阅列表」，由服务端解析。
 */
export const renderNewsletterSubscribeHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const submitLabel = settingText(s, "submit_label");
  // 没有按钮文案就整段不渲染——与事件订阅块同一条口径：没有可主张的就留白
  if (!submitLabel) return "";

  /*
   * 到这里 `{token}` 已由聚合层替好。仍然含 `{` 说明这一页没有那个 token
   *（比如把「当前主题」摆到了首页上）——退回「本站全部」，而不是把一个解不开的
   * key 发给服务端换一个 400。
   */
  const rawListKey = settingText(s, "list_key");
  const listKey = rawListKey.includes("{") ? NEWSLETTER_ALL_LISTS : rawListKey;
  const cadence = settingText(s, "cadence") || DEFAULT_DIGEST_CADENCE;
  const placeholder = settingText(s, "placeholder");
  const hint = settingText(s, "hint");
  const success = settingText(s, "success_message");

  const attrs = [
    `class="newsletter-subscribe"`,
    `data-section-id="${escapeHtml(section.id)}"`,
    `data-list-key="${escapeHtml(listKey)}"`,
    `data-cadence="${escapeHtml(cadence)}"`,
    success ? `data-success-message="${escapeHtml(success)}"` : "",
    "novalidate",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    sectionHeading(s),
    `<form ${attrs}>`,
    `<div class="newsletter-row">`,
    `<label class="newsletter-label" for="newsletter-email-${escapeHtml(section.id)}">`,
    // 视觉上不显示标签，但读屏软件必须拿得到——只有 placeholder 的输入框对它是空的
    `<span class="newsletter-label-text">${escapeHtml(placeholder || submitLabel)}</span>`,
    `</label>`,
    `<input id="newsletter-email-${escapeHtml(section.id)}" class="newsletter-input" type="email" name="email" autocomplete="email" required`,
    placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : "",
    ` />`,
    `<button class="btn newsletter-submit" type="submit">${escapeHtml(submitLabel)}</button>`,
    `</div>`,
    hint ? `<p class="newsletter-hint">${escapeHtml(hint)}</p>` : "",
    // 增强脚本把结果写进这里；aria-live 让读屏软件在不移动焦点的情况下播报
    `<p class="newsletter-message" data-newsletter-message role="status" aria-live="polite"></p>`,
    `</form>`,
  ]
    .filter(Boolean)
    .join("");
};
