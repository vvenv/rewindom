/** 页脚的 SSR 渲染（block 组合版）。 */

import { escapeHtml } from "../../html.js";
import { settingBool, settingText } from "../../section-schema.js";
import { siteNavPages, type PublicSitePage } from "../../site-cms.js";
import {
  resolveNavItems,
  settingNavItems,
  type ResolvedNavItem,
  type SiteNavContext,
} from "../../site-nav.js";
import { blockSurfaceAttr, linkAttrs } from "../_common/html.js";

import type { PublicDocSummary } from "../../marketing-doc.js";
import type { SiteBlock } from "../../section-schema.js";
import type { SiteSection } from "../types.js";
import type { AppLocale } from "@be-water/shared";

function renderFooterItemHtml(item: ResolvedNavItem): string {
  const label = escapeHtml(item.label);
  const self = item.href
    ? `<a${linkAttrs(item.href)}>${label}</a>`
    : `<span class="footer-group">${label}</span>`;
  if (item.children.length === 0) return `<li>${self}</li>`;
  return `<li>${self}<ul class="footer-sublist">${item.children
    .map(renderFooterItemHtml)
    .join("")}</ul></li>`;
}

function renderFooterBrandHtml(input: {
  block: SiteBlock;
  siteName: string;
  logoUrl: string | null;
}): string {
  const s = input.block.settings;
  const blurb = settingText(s, "blurb");
  return `<div data-block-id="${escapeHtml(input.block.id)}">
      <div class="brand">
        ${settingBool(s, "show_logo") && input.logoUrl ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(input.siteName)}" />` : ""}
        ${settingBool(s, "show_site_name") ? `<span>${escapeHtml(input.siteName)}</span>` : ""}
      </div>
      ${blurb ? `<p class="muted">${escapeHtml(blurb)}</p>` : ""}
    </div>`;
}

function renderFooterMenuColumnHtml(input: {
  block: SiteBlock;
  ctx: SiteNavContext;
}): string {
  const items = resolveNavItems(settingNavItems(input.block.settings), input.ctx);
  if (items.length === 0) return "";
  const title = settingText(input.block.settings, "title");
  return `<nav data-block-id="${escapeHtml(input.block.id)}">
  ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
  <ul>${items.map(renderFooterItemHtml).join("")}</ul>
</nav>`;
}

function renderFooterCopyrightHtml(input: {
  block: SiteBlock;
  siteName: string;
}): string {
  const text =
    settingText(input.block.settings, "text") ||
    `© ${new Date().getFullYear()} ${input.siteName}`;
  return `<div class="wrap footer-legal" data-block-id="${escapeHtml(input.block.id)}">${escapeHtml(text)}</div>`;
}

export function renderFooterHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
}): string {
  const { section, siteName, logoUrl } = input;
  const s = section.settings;
  const defaultLocale = input.defaultLocale ?? "zh-CN";
  const ctx: SiteNavContext = {
    navPages: siteNavPages(input.pages ?? []),
    docs: input.docs,
    locale: input.locale ?? defaultLocale,
    defaultLocale,
    currentPath: input.currentPath ?? "",
  };

  const gridBlocks: string[] = [];
  const legalBlocks: string[] = [];

  for (const block of section.blocks) {
    switch (block.type) {
      case "chrome_brand":
        gridBlocks.push(renderFooterBrandHtml({ block, siteName, logoUrl }));
        break;
      case "menu_column": {
        const column = renderFooterMenuColumnHtml({ block, ctx });
        if (column) gridBlocks.push(column);
        break;
      }
      case "chrome_copyright":
        legalBlocks.push(renderFooterCopyrightHtml({ block, siteName }));
        break;
      default:
        break;
    }
  }

  const grid =
    gridBlocks.length > 0
      ? `<div class="wrap footer-grid">${gridBlocks.join("")}</div>`
      : "";

  return `<footer class="site-footer"${blockSurfaceAttr(s)}>
  ${grid}
  ${legalBlocks.join("")}
</footer>`;
}
