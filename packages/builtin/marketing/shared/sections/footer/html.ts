/** 页脚的 SSR 渲染；与页头同为站点级 chrome，不进段流。 */

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
import type { SiteSection } from "../types.js";
import type { AppLocale } from "@be-water/shared";

/**
 * 一条页脚链接。子项（文档分类那一层）缩进列在下面——页脚列本来就是竖着排的，
 * 不像页头要收成下拉。
 */
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

export function renderFooterHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  /** 导航动态项的数据源（同页头）。 */
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
}): string {
  const { section, siteName, logoUrl } = input;
  const s = section.settings;
  const blurb = settingText(s, "blurb");
  const copyright =
    settingText(s, "copyright") || `© ${new Date().getFullYear()} ${siteName}`;

  const defaultLocale = input.defaultLocale ?? "zh-CN";
  const ctx: SiteNavContext = {
    navPages: siteNavPages(input.pages ?? []),
    docs: input.docs,
    locale: input.locale ?? defaultLocale,
    defaultLocale,
    currentPath: input.currentPath ?? "",
  };

  const columns = section.blocks
    .map((block) => {
      const items = resolveNavItems(settingNavItems(block.settings), ctx);
      // 一列都展不出内容就整列不画
      if (items.length === 0) return "";
      const title = settingText(block.settings, "title");
      return `<nav>
  ${title ? `<h2>${escapeHtml(title)}</h2>` : ""}
  <ul>${items.map(renderFooterItemHtml).join("")}</ul>
</nav>`;
    })
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
