import { escapeHtml } from "../../html.js";
import { settingNumber, settingText } from "../../section-schema.js";
import {
  blockSurfaceAttr,
  gridClass,
  linkAttrs,
  sectionHeading,
} from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";
import type { SiteBlock } from "../types.js";

function renderCardBlock(block: SiteBlock, plain: boolean): string {
  const cls = plain ? "card card-plain" : "card";
  const surface = blockSurfaceAttr(block.settings);
  if (block.type === "stat") {
    const label = settingText(block.settings, "label");
    return `<li class="${cls}"${surface}><strong class="stat-value">${escapeHtml(settingText(block.settings, "value"))}</strong>${
      label ? `<p class="muted">${escapeHtml(label)}</p>` : ""
    }</li>`;
  }
  const body = settingText(block.settings, "body");
  const href = settingText(block.settings, "href");
  const inner = `<span class="title">${escapeHtml(settingText(block.settings, "title"))}</span>${
    body ? `<span class="muted">${escapeHtml(body)}</span>` : ""
  }`;
  if (href) {
    return `<li><a class="${cls}"${linkAttrs(href)}${surface}>${inner}</a></li>`;
  }
  return `<li class="${cls}"${surface}>${inner}</li>`;
}

export const renderCardsHtml: SectionHtmlRenderer = (section) => {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const plain = settingText(s, "card_style") === "plain";
  const items = section.blocks
    .map((block) => renderCardBlock(block, plain))
    .join("");
  return `${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ul>`;
};
