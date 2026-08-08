/** 页脚的 SSR 渲染；与页头同为站点级 chrome，不进段流。 */

import { escapeHtml } from "../../html.js";
import { settingBool, settingText } from "../../section-schema.js";
import { blockSurfaceAttr, linkAttrs } from "../_common/html.js";

import type { SiteBlock, SiteSection } from "../types.js";

export function renderFooterHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
}): string {
  const { section, siteName, logoUrl } = input;
  const s = section.settings;
  const blurb = settingText(s, "blurb");
  const copyright =
    settingText(s, "copyright") || `© ${new Date().getFullYear()} ${siteName}`;

  const groups: Array<{ group: string; links: SiteBlock[] }> = [];
  for (const block of section.blocks) {
    const group = settingText(block.settings, "group").trim();
    const existing = groups.find((item) => item.group === group);
    if (existing) existing.links.push(block);
    else groups.push({ group, links: [block] });
  }

  const columns = groups
    .map(
      (group) => `<nav>
  ${group.group ? `<h2>${escapeHtml(group.group)}</h2>` : ""}
  <ul>${group.links
    .map(
      (block) =>
        `<li><a${linkAttrs(settingText(block.settings, "href"))}>${escapeHtml(settingText(block.settings, "label"))}</a></li>`,
    )
    .join("")}</ul>
</nav>`,
    )
    .join("");

  return `<footer class="site-footer"${blockSurfaceAttr(s)}>
  <div class="wrap footer-grid">
    <div>
      <div class="brand">
        ${settingBool(s, "show_logo") && logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" />` : ""}
        <span>${escapeHtml(siteName)}</span>
      </div>
      ${blurb ? `<p class="muted">${escapeHtml(blurb)}</p>` : ""}
    </div>
    ${columns}
  </div>
  <div class="wrap footer-legal">${escapeHtml(copyright)}</div>
</footer>`;
}
