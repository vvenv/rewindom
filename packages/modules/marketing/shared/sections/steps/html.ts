import { escapeHtml } from "../../html.js";
import {
  settingBool,
  settingNumber,
  settingText,
} from "../../section-schema.js";
import { blockSurfaceAttr, gridClass, sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderStepsHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const showNumber = settingBool(s, "show_number");
  const items = section.blocks
    .map((block, index) => {
      const body = settingText(block.settings, "body");
      const code = settingText(block.settings, "code");
      return `<li class="card"${blockSurfaceAttr(block.settings)}>
  ${showNumber ? `<span class="eyebrow">${String(index + 1).padStart(2, "0")}</span>` : ""}
  <p class="title">${escapeHtml(settingText(block.settings, "title"))}</p>
  ${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}
  ${code ? `<code>${escapeHtml(code)}</code>` : ""}
</li>`;
    })
    .join("");
  return `${sectionHeading(s, true)}
  <ol class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ol>`;
};
