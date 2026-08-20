import { escapeHtml } from "../../html.js";
import { settingText, type SettingValues } from "../../section-schema.js";
import { buttonRow, md } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

function splitMedia(settings: SettingValues): string {
  const image = settingText(settings, "image");
  if (image) {
    const alt = settingText(settings, "image_alt");
    return `<div class="spl-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" /></div>`;
  }
  const panel = settingText(settings, "panel_md");
  if (panel) {
    return `<div class="spl-media"><div class="spl-panel prose">${md(panel)}</div></div>`;
  }
  return `<div class="spl-media"><div class="spl-deco" aria-hidden="true"></div></div>`;
}

export const renderSplitHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const body = settingText(s, "body");
  const side = settingText(s, "media_side") === "left" ? " media-left" : "";
  const copy = `<div class="spl-copy">
  ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}
  ${subheading ? `<p class="lead">${escapeHtml(subheading)}</p>` : ""}
  ${body ? `<p class="lead">${escapeHtml(body)}</p>` : ""}
  ${buttonRow(s, "left")}
</div>`;

  return `<div class="spl${side}">${copy}${splitMedia(s)}</div>`;
};
