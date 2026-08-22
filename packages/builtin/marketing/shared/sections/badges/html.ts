import { escapeHtml } from "../../html.js";
import {
  isIconImageUrl,
  settingNumber,
  settingText,
  type SiteBlock,
} from "../../section-schema.js";
import { linkAttrs, sectionHeading } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

function badgeImage(
  src: string,
  className: string,
  height: number,
  decorative: boolean,
  alt: string,
): string {
  const altAttr = decorative ? "" : escapeHtml(alt);
  return `<img class="${className}" src="${escapeHtml(src)}" alt="${altAttr}" height="${height}" />`;
}

function renderBadge(block: SiteBlock, height: number): string {
  const image = settingText(block.settings, "image").trim();
  if (!isIconImageUrl(image)) return "";
  const dark = settingText(block.settings, "image_dark").trim();
  const hasDark = isIconImageUrl(dark);
  const href = settingText(block.settings, "href").trim();
  const alt = settingText(block.settings, "alt").trim();
  // 有链接时名字在 <a aria-label> 上，图一律空 alt，避免读屏念两遍。
  // 没链接时两张都带同一份 alt——display:none 的那张不进无障碍树。
  const decorative = Boolean(href);
  const images = `${badgeImage(
    image,
    hasDark ? "bdg-img bdg-img-light" : "bdg-img",
    height,
    decorative,
    alt,
  )}${
    hasDark
      ? badgeImage(dark, "bdg-img bdg-img-dark", height, decorative, alt)
      : ""
  }`;
  if (href) {
    const label = alt ? ` aria-label="${escapeHtml(alt)}"` : "";
    return `<a class="bdg-item"${linkAttrs(href)}${label} data-block-id="${escapeHtml(block.id)}">${images}</a>`;
  }
  return `<span class="bdg-item" data-block-id="${escapeHtml(block.id)}">${images}</span>`;
}

export const renderBadgesHtml: SectionHtmlRenderer = (section) => {
  const s = section.settings;
  const height = settingNumber(s, "height", 54);
  const align = settingText(s, "align");
  const items = section.blocks
    .map((block) => renderBadge(block, height))
    .filter(Boolean)
    .join("");
  const heading = sectionHeading(s);
  if (!items && !heading) return "";
  const hasDark = section.blocks.some((block) =>
    isIconImageUrl(settingText(block.settings, "image_dark").trim()),
  );
  const classes = [
    "bdg",
    align === "center" ? "center" : "",
    hasDark ? "has-dark" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${heading}<div class="${classes}" style="--bdg-h:${height}px">${items}</div>`;
};
