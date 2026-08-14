import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { buttonRow } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderPageMissingSectionHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const code = settingText(s, "code") || "404";
  const headline = settingText(s, "headline");
  const subhead = settingText(s, "subhead");
  return `<div class="page-missing">
  <p class="page-missing-code" aria-hidden="true">${escapeHtml(code)}</p>
  ${headline ? `<h1>${escapeHtml(headline)}</h1>` : ""}
  ${subhead ? `<p class="lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(s, "center")}
</div>`;
};
