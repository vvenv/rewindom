import { escapeHtml } from "../../html.js";
import { settingText, type SettingValues } from "../../section-schema.js";
import { buttonRow } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

function heroMedia(settings: SettingValues): string {
  const image = settingText(settings, "image");
  if (image) {
    const alt = settingText(settings, "image_alt");
    return `<div class="hero-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" /></div>`;
  }
  return `<div class="hero-media"><div class="hero-media-deco" aria-hidden="true"></div></div>`;
}

export const renderHeroHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const align = settingText(s, "align");
  const split = settingText(s, "layout") === "split";
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");
  const stats = section.blocks
    .map(
      (block) =>
        `<div><dt>${escapeHtml(settingText(block.settings, "term"))}</dt><dd>${escapeHtml(settingText(block.settings, "detail"))}</dd></div>`,
    )
    .join("");
  const classes = [
    "hero",
    align === "center" ? "center" : "",
    split ? "hero-split" : "",
    split && settingText(s, "media_side") === "left" ? "media-left" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const copy = `<div class="hero-copy">
  ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1>${escapeHtml(settingText(s, "headline"))}</h1>
  ${subhead ? `<p class="lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(s, align)}
  ${stats ? `<dl class="stats">${stats}</dl>` : ""}
</div>`;

  return `<div class="${classes}">${copy}${split ? heroMedia(s) : ""}</div>`;
};
