import { escapeHtml } from "../../../../../packages/builtin/marketing/shared/html.js";
import {
  settingBool,
  settingText,
} from "../../../../../packages/builtin/marketing/shared/section-schema.js";
import {
  isExternal,
  linkAttrs,
  md,
} from "../../../../../packages/builtin/marketing/shared/sections/_common/html.js";
import { withSiteLocale } from "../../../../../packages/builtin/marketing/shared/site-locale.js";
import { DOCS_INDEX_PATH, docMessages, formatDocDate } from "../../site-doc.js";
import { readSiteDocsContext } from "../../site-docs-context.js";

import type { SectionHtmlRenderer } from "../../../../../packages/builtin/marketing/shared/sections/render-context.js";

export const renderSiteDocsArticleHtml: SectionHtmlRenderer = (
  section,
  ctx,
) => {
  const doc = readSiteDocsContext(ctx)?.doc;
  if (!doc) return "";
  const s = section.settings;
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);
  const docsIndexPath =
    readSiteDocsContext(ctx)?.docsIndexPath ?? DOCS_INDEX_PATH;

  let back = "";
  if (settingBool(s, "show_back")) {
    const target = settingText(s, "back_href") || docsIndexPath;
    const href =
      ctx.locale &&
      ctx.defaultLocale &&
      !isExternal(target) &&
      !target.startsWith("#")
        ? withSiteLocale(target, ctx.locale, ctx.defaultLocale)
        : target;
    const label = settingText(s, "back_label") || messages.back;
    back = `<a class="doc-article-back"${linkAttrs(href)}>← ${escapeHtml(label)}</a>`;
  }

  const category =
    settingBool(s, "show_category") && doc.category
      ? `<span class="doc-tag">${escapeHtml(doc.category_label)}</span>`
      : "";
  const updated = settingBool(s, "show_updated")
    ? `<span>${escapeHtml(messages.updated)} ${escapeHtml(formatDocDate(doc.updated_at, locale))}</span>`
    : "";
  const meta =
    category || updated
      ? `<div class="doc-article-meta">${category}${updated}</div>`
      : "";

  const title = settingBool(s, "show_title")
    ? `<h1>${escapeHtml(doc.title)}</h1>`
    : "";
  const lead =
    settingBool(s, "show_description") && doc.description
      ? `<p class="doc-article-lead">${escapeHtml(doc.description)}</p>`
      : "";

  const below = settingText(s, "meta_position") === "below";
  const cls =
    settingText(s, "align") === "center"
      ? "doc-article doc-article-center"
      : "doc-article";

  return `<article class="${cls}">
  ${back}
  ${below ? "" : meta}
  ${title}
  ${lead}
  ${below ? meta : ""}
  <div class="prose">${md(doc.body_md)}</div>
</article>`;
};
