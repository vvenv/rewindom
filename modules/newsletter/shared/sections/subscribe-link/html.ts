import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-schema.js";

import type { ChromeBlockHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/_common/chrome-html.js";

/** 16×16 内联 SVG，与页头 / 页脚其余控件同尺寸。 */
const MAIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;

/**
 * 页头 / 页脚的订阅入口。
 *
 * 挂 `chrome-control`：同排并列，尺寸由页头 / 页脚上的 `--chrome-control-*` token
 * 决定，不要自己写 height。
 *
 * `href` 到这里已经是成品——聚合层按 schema 把 `link` 类型的 setting 做过 `{token}`
 * 插值了，渲染器不要再插一遍，也不要暗改租户填的地址。
 */
export const renderNewsletterSubscribeBlockHtml: ChromeBlockHtmlRenderer = (
  block,
) => {
  const label = settingText(block.settings, "label");
  const href = settingText(block.settings, "href");
  // 没有文案或没有去处就整块不渲染——与事件订阅块同一条口径：没有可主张的就留白
  if (!label || !href) return "";

  const iconOnly = settingBool(block.settings, "icon_only");
  const safeLabel = escapeHtml(label);

  return [
    `<a class="chrome-control newsletter-subscribe-link" href="${escapeHtml(href)}"`,
    ` title="${safeLabel}"`,
    // 只剩图标的链接对读屏软件是空的（图标本身已 aria-hidden），必须补名字
    iconOnly ? ` aria-label="${safeLabel}"` : "",
    `>${MAIL_ICON}`,
    iconOnly ? "" : `<span>${safeLabel}</span>`,
    `</a>`,
  ]
    .filter(Boolean)
    .join("");
};
