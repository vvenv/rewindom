import { escapeHtml } from "../../../../../packages/builtin/marketing/shared/html.js";
import { settingBool, settingText } from "../../../../../packages/builtin/marketing/shared/section-schema.js";

import { docMessages, extractDocHeadings } from "../../site-doc.js";
import { readSiteDocsContext } from "../../site-docs-context.js";

import type { SectionHtmlRenderer } from "../../../../../packages/builtin/marketing/shared/sections/render-context.js";

export const renderSiteDocsTocHtml: SectionHtmlRenderer = (section, ctx) => {
  const doc = readSiteDocsContext(ctx)?.doc;
  if (!doc) return "";
  const s = section.settings;
  const max = settingText(s, "depth") === "2" ? 2 : 3;
  const headings = extractDocHeadings(doc.body_md, { min: 2, max });
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
