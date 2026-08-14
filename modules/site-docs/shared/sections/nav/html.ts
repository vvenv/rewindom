import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
import { settingBool, settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";
import { siteHref } from "@rewindom/builtin/marketing/shared/site-locale.js";

import {
  docMessages,
  docPath,
  groupDocsByCategory,
} from "../../site-doc.js";
import { readSiteDocsContext } from "../../site-docs-context.js";

import type { SectionHtmlRenderer } from "@rewindom/builtin/marketing/shared/sections/render-context.js";

export const renderSiteDocsNavHtml: SectionHtmlRenderer = (section, ctx) => {
  const docs = readSiteDocsContext(ctx)?.docs ?? [];
  if (docs.length === 0) return "";
  const s = section.settings;
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);
  const heading = settingText(s, "heading");
  const showCategory = settingBool(s, "show_category");
  const currentPath = ctx.currentPath ?? "";

  const href = (slug: string): string => {
    return escapeHtml(siteHref(docPath(slug), ctx));
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

  const groups = showCategory ? groupDocsByCategory(docs) : [];
  const body =
    groups.length > 1
      ? groups
          .map(
            (group) =>
              `<div class="doc-nav-group">${
                group.category
                  ? `<p class="doc-nav-group-title">${escapeHtml(group.category_label)}</p>`
                  : ""
              }${items(group.items)}</div>`,
          )
          .join("")
      : items(docs);

  return `<nav class="doc-nav${settingBool(s, "sticky") ? " is-sticky" : ""}" aria-label="${escapeHtml(heading || messages.nav)}">
  ${heading ? `<p class="doc-nav-title">${escapeHtml(heading)}</p>` : ""}
  ${body}
</nav>`;
};
