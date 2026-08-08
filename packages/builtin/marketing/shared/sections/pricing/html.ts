import { escapeHtml } from "../../html.js";
import {
  settingBool,
  settingLines,
  settingNumber,
  settingText,
} from "../../section-schema.js";
import {
  blockSurfaceAttr,
  gridClass,
  linkAttrs,
  sectionHeading,
} from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderPricingHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const badge = settingText(s, "featured_badge");
  const footnote = settingText(s, "footnote");
  const plans = section.blocks
    .map((block) => {
      const b = block.settings;
      const featured = settingBool(b, "featured");
      const audience = settingText(b, "audience");
      const priceNote = settingText(b, "price_note");
      const label = settingText(b, "primary_label");
      const href = settingText(b, "primary_href");
      const highlights = settingLines(b, "highlights")
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      return `<li class="plan${featured ? " featured" : ""}"${blockSurfaceAttr(b)}>
  ${featured && badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}
  <h3>${escapeHtml(settingText(b, "name"))}</h3>
  ${audience ? `<p class="muted">${escapeHtml(audience)}</p>` : ""}
  <p class="price">${escapeHtml(settingText(b, "price"))}</p>
  ${priceNote ? `<p class="muted">${escapeHtml(priceNote)}</p>` : ""}
  ${highlights ? `<ul class="checks">${highlights}</ul>` : ""}
  ${label && href ? `<a class="btn${featured ? "" : " btn-secondary"} btn-block"${linkAttrs(href)}>${escapeHtml(label)}</a>` : ""}
</li>`;
    })
    .join("");
  return `${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))} plans">${plans}</ul>
  ${footnote ? `<p class="muted">${escapeHtml(footnote)}</p>` : ""}`;
};
