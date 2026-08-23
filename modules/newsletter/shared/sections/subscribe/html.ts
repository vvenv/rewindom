import { readNewsletterContext } from "../../newsletter-section-context.js";
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
/**
 * 「订阅范围：AI · 每天一封摘要」。
 *
 * 分隔点是**装饰**，`aria-hidden`：读屏软件把它念成「中间点」只是噪音，两段文案
 * 本来就各成一句。
 */
function renderMeta(scope: string, cadence: string): string {
  const parts = [
    scope
      ? `<span class="newsletter-meta-scope">${escapeHtml(scope)}</span>`
      : "",
    cadence
      ? `<span class="newsletter-meta-cadence">${escapeHtml(cadence)}</span>`
      : "",
  ].filter(Boolean);
  if (parts.length === 0) return "";
  const sep = `<span class="newsletter-meta-sep" aria-hidden="true"> · </span>`;
  return `<p class="newsletter-meta">${parts.join(sep)}</p>`;
}

export const renderNewsletterSubscribeHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const s = section.settings;
  const submitLabel = settingText(s, "submit_label");
  // 没有按钮文案就整段不渲染——与事件订阅块同一条口径：没有可主张的就留白
  if (!submitLabel) return "";

  /*
   * 到这里 `{token}` 已由聚合层替好。仍然含 `{` 说明这一页没有那个 token
   *（比如把「当前主题」摆到了首页上）——退回「本站全部」，而不是把一个解不开的
   * key 发给服务端换一个 400。
   */
  /*
   * 订阅范围的优先级：**URL 指定的 > 段设置里的**。
   *
   * 订阅页是可以被带参数链过来的（`/subscribe?list=events:topic:ai`），那时读者的
   * 意图明确写在地址里，比站长在段上配的默认值更具体。范围合不合法由 SSR 路由
   * 校验过了（认不出的 key 根本不会进上下文）。
   */
  const context = readNewsletterContext({ contributed: ctx?.contributed });
  const scope = context?.subscribe;
  const rawListKey = scope?.list_key ?? settingText(s, "list_key");
  const listKey = rawListKey.includes("{") ? NEWSLETTER_ALL_LISTS : rawListKey;
  const cadence = settingText(s, "cadence") || DEFAULT_DIGEST_CADENCE;

  /*
   * 「订阅范围：AI · 每天一封摘要」——这一行必须常驻，不是只在被带参数链过来时才出。
   *
   * 两件事读者都无处可查：**周期是租户在段设置里定的**，表单上没有可选项，不写出来
   * 读者就不知道自己按了「订阅」之后会多久收到一封；范围不写出来，从主题页点过来的
   * 读者会以为自己订的是全站。
   *
   * 文案是成品（渲染器拿不到 i18n）：URL 指定的那一次由订阅页路由算好，段设置里选的
   * 那个从按 key 取的表里查——`contributed` 是页面级的，给不了「这一段选了什么」。
   */
  // 空 key 是存量数据里的「本站全部」（见上面 `data-list-key` 那条），查表要按它归一
  const scopeKey = listKey || NEWSLETTER_ALL_LISTS;
  const scopeLine =
    scope?.scope_label || context?.labels?.scopes[scopeKey] || "";
  const cadenceLine = context?.labels?.cadences[cadence] ?? "";
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
    // 一项都没解出来时整行不画——一个空的「订阅范围：」比不显示更糟
    renderMeta(scopeLine, cadenceLine),
    hint ? `<p class="newsletter-hint">${escapeHtml(hint)}</p>` : "",
    // 增强脚本把结果写进这里；aria-live 让读屏软件在不移动焦点的情况下播报
    `<p class="newsletter-message" data-newsletter-message role="status" aria-live="polite"></p>`,
    `</form>`,
  ]
    .filter(Boolean)
    .join("");
};
