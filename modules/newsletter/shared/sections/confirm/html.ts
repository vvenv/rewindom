import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import { readNewsletterContext } from "../../newsletter-section-context.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 确认面板。
 *
 * **副作用只在 POST**：这里出的是一个带 token 的真 form，GET 不会确认任何东西。
 * 邮件客户端与企业安全网关会替用户预取链接，GET 就落确认的话，扫描器点一遍
 * 等于用户确认了。
 *
 * 拿不到上下文（编辑器预览）时按**表单态**渲染——那正是预览该显示的样子。
 */
export const renderNewsletterConfirmHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const s = section.settings;
  const confirm = readNewsletterContext(ctx)?.confirm;
  const result = confirm?.result ?? "form";

  if (result === "ok") {
    return `${sectionHeading(s)}<p class="newsletter-panel-message" data-tone="success">${escapeHtml(settingText(s, "success_message"))}</p>`;
  }
  if (result === "invalid") {
    return `${sectionHeading(s)}<p class="newsletter-panel-message" data-tone="error">${escapeHtml(settingText(s, "invalid_message"))}</p>`;
  }

  const label = settingText(s, "submit_label");
  if (!label) return "";
  // 预览里没有 token，出一个空的 hidden 就好——按钮点不出结果，但版式是真的
  const action = confirm?.action ?? "/newsletter/confirm";
  return [
    sectionHeading(s),
    `<form class="newsletter-panel" method="post" action="${escapeHtml(action)}">`,
    `<input type="hidden" name="token" value="${escapeHtml(confirm?.token ?? "")}" />`,
    `<button class="btn" type="submit">${escapeHtml(label)}</button>`,
    `</form>`,
  ].join("");
};
