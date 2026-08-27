import { readUselessContext } from "../../useless-section-context.js";

import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { sectionHeading } from "@rewindom/builtin/marketing/shared/sections/_common/html.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

/**
 * 今天那条的 SSR。
 *
 * **句子直接进 HTML，不留客户端取数**：关掉 JS 也看得见，没有 loading 态、没有
 * 闪一下。这一段没有任何交互，所以也不需要 site-enhance 脚本。
 *
 * 池子空时渲染 `empty_text` 而不是整段消失——段是租户主动摆上去的，凭空不见
 * 会让人以为坏了。上下文缺失（编辑器预览没登记 provider、或 provider 抛错）
 * 走的是同一条空态分支，那也正是此时该显示的样子。
 */
export const renderUselessTodayHtml: SectionHtmlRenderer = (section, ctx) => {
  const s = section.settings;
  const context = readUselessContext({ contributed: ctx?.contributed });
  const text = context?.today?.text ?? "";

  const body = text
    ? `<p class="useless-today-text">${escapeHtml(text)}</p>`
    : (() => {
        const empty = settingText(s, "empty_text");
        return empty
          ? `<p class="useless-today-empty">${escapeHtml(empty)}</p>`
          : "";
      })();

  return [
    sectionHeading(s),
    `<div class="useless-today">`,
    body,
    `</div>`,
  ].join("");
};
