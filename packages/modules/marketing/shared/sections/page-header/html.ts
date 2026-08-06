import { escapeHtml } from "../../html.js";
import { resolvePageHeaderText, settingText } from "../../section-schema.js";

import type { SectionHtmlRenderer } from "../render-context.js";

/**
 * 页面标题段：与客户端 `PageHeaderSection` 同一份回落逻辑
 * （`resolvePageHeaderText`），否则 SSR 出的 h1 会和 hydrate 后的对不上。
 */
export const renderPageHeaderHtml: SectionHtmlRenderer = (section, ctx) => {
  const page = ctx.pages?.find(
    (item) => item.path === (ctx.currentPath ?? "/"),
  );
  const { headline, subhead } = resolvePageHeaderText(section.settings, page);
  if (!headline && !subhead) return "";
  const align =
    settingText(section.settings, "align") === "center"
      ? ' style="text-align:center"'
      : "";
  return `<div class="page-head"${align}>${
    headline ? `<h1>${escapeHtml(headline)}</h1>` : ""
  }${subhead ? `<p>${escapeHtml(subhead)}</p>` : ""}</div>`;
};
