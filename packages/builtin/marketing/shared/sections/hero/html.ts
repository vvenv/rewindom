import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { buttonRow } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderHeroHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const align = settingText(s, "align");
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");
  const stats = section.blocks
    .map(
      (block) =>
        `<div><dt>${escapeHtml(settingText(block.settings, "term"))}</dt><dd>${escapeHtml(settingText(block.settings, "detail"))}</dd></div>`,
    )
    .join("");

  return `<div class="hero${align === "center" ? " center" : ""}">
  ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1>${escapeHtml(settingText(s, "headline"))}</h1>
  ${subhead ? `<p class="lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(s, align)}
  ${stats ? `<dl class="stats">${stats}</dl>` : ""}
</div>`;
};
