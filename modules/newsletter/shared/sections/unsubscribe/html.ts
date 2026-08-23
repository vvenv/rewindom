import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import { readNewsletterContext } from "../../newsletter-section-context.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 退订面板。
 *
 * **「全部退订」始终是默认且最显眼的那颗**：读者点退订链接的意图九成是「别再发了」。
 * 挑着退是次要路径，勾了才走——把它做成必须先勾选才能退，等于把人推向
 * 「举报垃圾邮件」那个按钮。
 *
 * 同样只在 POST 落副作用：Gmail 的图片代理会预取链接，GET 退订能把整个名单退光。
 */
export const renderNewsletterUnsubscribeHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const s = section.settings;
  const unsub = readNewsletterContext(ctx)?.unsubscribe;
  const result = unsub?.result ?? "form";

  if (result === "ok") {
    return `${sectionHeading(s)}<p class="newsletter-panel-message" data-tone="success">${escapeHtml(settingText(s, "success_message"))}</p>`;
  }
  if (result === "invalid") {
    return `${sectionHeading(s)}<p class="newsletter-panel-message" data-tone="error">${escapeHtml(settingText(s, "invalid_message"))}</p>`;
  }

  const label = settingText(s, "submit_label");
  if (!label) return "";

  const lists = unsub?.lists ?? [];
  const action = unsub?.action ?? "/newsletter/unsubscribe";
  const checkboxes = lists
    .map(
      (listKey) =>
        `<li><label><input type="checkbox" name="list_keys" value="${escapeHtml(listKey)}" /> <span>${escapeHtml(listKey)}</span></label></li>`,
    )
    .join("");

  return [
    sectionHeading(s),
    `<form class="newsletter-panel" method="post" action="${escapeHtml(action)}">`,
    `<input type="hidden" name="token" value="${escapeHtml(unsub?.token ?? "")}" />`,
    unsub?.email
      ? `<p class="newsletter-panel-email">${escapeHtml(unsub.email)}</p>`
      : "",
    // 只订了一个列表时不出勾选框：多一个控件只会让「点哪个才退掉」变得可疑
    lists.length > 1
      ? `<ul class="newsletter-panel-lists">${checkboxes}</ul>`
      : "",
    `<button class="btn" type="submit">${escapeHtml(label)}</button>`,
    `</form>`,
  ]
    .filter(Boolean)
    .join("");
};
