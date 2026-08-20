import { escapeHtml } from "../../html.js";
import { settingNumber, settingText } from "../../section-schema.js";
import {
  gridClass,
  iconHtmlFromSettings,
  linkAttrs,
  sectionHeading,
} from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderFeatureGridHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const plain = settingText(s, "card_style") === "plain";
  const showIcons = s.show_icons !== false;
  const cards = section.blocks
    .map((block) => {
      const title = settingText(block.settings, "title");
      const body = settingText(block.settings, "body");
      const href = settingText(block.settings, "href");
      const inner = `${showIcons ? iconHtmlFromSettings(block.settings) : ""}<span class="title">${escapeHtml(title)}</span>${body ? `<span class="muted">${escapeHtml(body)}</span>` : ""}`;
      const className = `card${plain ? " card-plain" : ""}`;
      return href
        ? `<a class="${className}"${linkAttrs(href)}>${inner}</a>`
        : `<div class="${className}">${inner}</div>`;
    })
    .join("");

  return `${sectionHeading(s)}<div class="fg ${gridClass(settingNumber(s, "columns", 3))}">${cards}</div>`;
};
