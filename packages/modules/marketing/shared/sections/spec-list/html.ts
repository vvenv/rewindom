import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { linkAttrs, sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderSpecListHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const rows = section.blocks
    .map(
      (block) =>
        `<div class="spec-row"><dt>${escapeHtml(settingText(block.settings, "term"))}</dt><dd>${escapeHtml(settingText(block.settings, "detail"))}</dd></div>`,
    )
    .join("");
  const table = `<dl class="spec">${rows}</dl>`;

  if (settingText(s, "layout") === "stacked") {
    return `${sectionHeading(s, true)}${table}`;
  }

  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const label = settingText(s, "primary_label");
  const href = settingText(s, "primary_href");
  return `<div class="split">
  <div>
    ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}
    ${subheading ? `<p class="lead">${escapeHtml(subheading)}</p>` : ""}
    ${label && href ? `<p><a class="btn btn-secondary"${linkAttrs(href)}>${escapeHtml(label)}</a></p>` : ""}
  </div>
  ${table}
</div>`;
};
