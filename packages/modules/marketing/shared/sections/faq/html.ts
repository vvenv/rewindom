import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { blockSurfaceAttr, sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderFaqHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const items = section.blocks
    .map((block) => {
      const answer = settingText(block.settings, "answer");
      return `<div class="qa"${blockSurfaceAttr(block.settings)}>
  <dt>${escapeHtml(settingText(block.settings, "question"))}</dt>
  ${answer ? `<dd>${escapeHtml(answer)}</dd>` : ""}
</div>`;
    })
    .join("");
  return `${sectionHeading(section.settings)}
  <dl class="spec">${items}</dl>`;
};
