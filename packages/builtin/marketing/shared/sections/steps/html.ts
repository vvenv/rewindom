import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderStepsHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const showNumber = s.show_number !== false;
  const items = section.blocks
    .map((block, index) => {
      const title = settingText(block.settings, "title");
      const body = settingText(block.settings, "body");
      const num = showNumber
        ? `<span class="step-num">${String(index + 1).padStart(2, "0")}</span>`
        : "";
      return `<li class="step">${num}<div class="step-body"><p class="title">${escapeHtml(title)}</p>${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}</div></li>`;
    })
    .join("");

  return `${sectionHeading(s)}<ol class="steps">${items}</ol>`;
};
