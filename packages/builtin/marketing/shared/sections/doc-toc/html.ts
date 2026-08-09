import { escapeHtml } from "../../html.js";
import { docMessages, extractDocHeadings } from "../../marketing-doc.js";
import { settingBool, settingText } from "../../section-schema.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderDocTocHtml: SectionHtmlRenderer = (section, ctx) => {
  const doc = ctx.doc;
  if (!doc) return "";
  const s = section.settings;
  const max = settingText(s, "depth") === "2" ? 2 : 3;
  const headings = extractDocHeadings(doc.body_md, { min: 2, max });
  // 一篇没有任何小标题的短文不该顶着一个空目录
  if (headings.length === 0) return "";

  const heading = settingText(s, "heading") || docMessages(ctx.locale ?? "en").toc;
  const items = headings
    .map(
      (item) =>
        `<li class="doc-toc-l${item.level}"><a href="#${escapeHtml(item.anchor)}">${escapeHtml(item.text)}</a></li>`,
    )
    .join("");

  return `<nav class="doc-toc${settingBool(s, "sticky") ? " is-sticky" : ""}" aria-label="${escapeHtml(heading)}">
  <p class="doc-toc-title">${escapeHtml(heading)}</p>
  <ul>${items}</ul>
</nav>`;
};
