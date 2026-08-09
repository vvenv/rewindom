import { escapeHtml } from "../../html.js";
import {
  docMessages,
  docPath,
  groupDocsByCategory,
} from "../../marketing-doc.js";
import { settingBool, settingText } from "../../section-schema.js";
import { withSiteLocale } from "../../site-locale.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderDocNavHtml: SectionHtmlRenderer = (section, ctx) => {
  const docs = ctx.docs ?? [];
  if (docs.length === 0) return "";
  const s = section.settings;
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);
  const heading = settingText(s, "heading");
  const showCategory = settingBool(s, "show_category");
  const currentPath = ctx.currentPath ?? "";

  const href = (slug: string): string => {
    const path = docPath(slug);
    return escapeHtml(
      ctx.locale && ctx.defaultLocale
        ? withSiteLocale(path, ctx.locale, ctx.defaultLocale)
        : path,
    );
  };

  const items = (
    list: readonly { slug: string; title: string }[],
  ): string =>
    `<ul>${list
      .map((doc) => {
        const current = docPath(doc.slug) === currentPath;
        return `<li><a href="${href(doc.slug)}"${current ? ' aria-current="page"' : ""}>${escapeHtml(doc.title)}</a></li>`;
      })
      .join("")}</ul>`;

  const body = showCategory
    ? groupDocsByCategory(docs, messages.otherCategory)
        .map(
          (group) =>
            `<div class="doc-nav-group"><p class="doc-nav-group-title">${escapeHtml(group.category)}</p>${items(group.items)}</div>`,
        )
        .join("")
    : items(docs);

  return `<nav class="doc-nav${settingBool(s, "sticky") ? " is-sticky" : ""}" aria-label="${escapeHtml(heading || messages.nav)}">
  ${heading ? `<p class="doc-nav-title">${escapeHtml(heading)}</p>` : ""}
  ${body}
</nav>`;
};
