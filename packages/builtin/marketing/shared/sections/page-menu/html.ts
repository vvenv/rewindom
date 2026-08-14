import { escapeHtml } from "../../html.js";
import { settingNumber, settingText } from "../../section-schema.js";
import {
  PAGE_MENU_SOURCES,
  resolvePageMenu,
  type PageMenuSource,
} from "../../site-cms.js";
import { siteHref } from "../../site-locale.js";
import { gridClass, sectionHeading } from "../_common/html.js";

import type {
  SectionHtmlRenderer,
  SectionRenderContext,
} from "../render-context.js";

function menuHref(path: string, ctx: SectionRenderContext): string {
  return siteHref(path, ctx);
}

export const renderPageMenuHtml: SectionHtmlRenderer = (section, ctx) => {
  const pages = ctx.pages ?? [];
  const currentPath = ctx.currentPath ?? "/";
  const s = section.settings;
  const rawSource = settingText(s, "source") || "children";
  const source: PageMenuSource = (
    PAGE_MENU_SOURCES as readonly string[]
  ).includes(rawSource)
    ? (rawSource as PageMenuSource)
    : "children";
  const style = settingText(s, "style") || "cards";
  const menu = resolvePageMenu(pages, currentPath, source);
  if (menu.items.length === 0) return "";

  const href = (path: string): string => escapeHtml(menuHref(path, ctx));

  if (style === "list") {
    const links = menu.items
      .map(
        (page) =>
          `<li${page.path === currentPath ? ' aria-current="page"' : ""}><a href="${href(page.path)}">${escapeHtml(page.title)}</a></li>`,
      )
      .join("");
    return `${sectionHeading(s)}
  <nav class="page-menu-list" aria-label="${escapeHtml(menu.title || "Pages")}">
    <ul>${links}</ul>
  </nav>`;
  }

  const cards = menu.items
    .map((page) => {
      const body = page.description
        ? `<span class="muted">${escapeHtml(page.description)}</span>`
        : "";
      return `<li><a class="card" href="${href(page.path)}"><span class="title">${escapeHtml(page.title)}</span>${body}</a></li>`;
    })
    .join("");
  return `${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 2))}">${cards}</ul>`;
};
