import { escapeHtml } from "../../html.js";
import { settingText } from "../../section-schema.js";
import { buttonRow } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderBandHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const body = settingText(s, "body");
  const align = settingText(s, "align");
  // 底色 / 描边由外层通用 background 承担，这里只管内容
  return `<div class="band${align === "center" ? " center" : ""}">
  <h2>${escapeHtml(settingText(s, "headline"))}</h2>
  ${body ? `<p class="lead">${escapeHtml(body)}</p>` : ""}
  ${buttonRow(s, align)}
</div>`;
};
