import { escapeHtml } from "../../../../../packages/builtin/marketing/shared/html.js";
import { withSiteLocale } from "../../../../../packages/builtin/marketing/shared/site-locale.js";
import { gridClass, sectionHeading } from "../../../../../packages/builtin/marketing/shared/sections/_common/html.js";

import {
  docMessages,
  docPath,
  formatDocDate,
  type PublicDocSummary,
} from "../../site-doc.js";
import { readSiteDocsContext } from "../../site-docs-context.js";

import { docSearchHaystack, resolveDocList } from "./select.js";

import type {
  SectionHtmlRenderer,
  SectionRenderContext,
} from "../../../../../packages/builtin/marketing/shared/sections/render-context.js";

function docHref(doc: PublicDocSummary, ctx: SectionRenderContext): string {
  const path = docPath(doc.slug);
  return escapeHtml(
    ctx.locale && ctx.defaultLocale
      ? withSiteLocale(path, ctx.locale, ctx.defaultLocale)
      : path,
  );
}

function searchAttr(doc: PublicDocSummary): string {
  return ` data-doc-search="${escapeHtml(docSearchHaystack(doc))}"`;
}

function filterChip(
  query: string,
  locale: string,
  indexHref: string,
  hits: number,
): string {
  const messages = docMessages(locale);
  const empty =
    hits === 0
      ? `<p class="doc-list-empty">${escapeHtml(messages.searchNoResults)}</p>`
      : "";
  return `<div class="doc-list-filter">
  <span class="doc-list-filter-term">${escapeHtml(messages.filtered)}${escapeHtml(query)}</span>
  <a class="doc-list-filter-clear" href="${escapeHtml(indexHref)}" aria-label="${escapeHtml(messages.clear)}" title="${escapeHtml(messages.clear)}">✕</a>
</div>${empty}`;
}

export const renderSiteDocsListHtml: SectionHtmlRenderer = (section, ctx) => {
  const docsCtx = readSiteDocsContext(ctx);
  const docs = docsCtx?.docs ?? [];
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);
  const query = docsCtx?.query?.trim() ?? "";
  const needle = query.toLowerCase();
  const filtered = needle
    ? docs.filter((doc) => docSearchHaystack(doc).includes(needle))
    : docs;
  const view = resolveDocList(section.settings, filtered);
  if (view.groups.length === 0 && !query) return "";

  const meta = (doc: PublicDocSummary): string =>
    view.showUpdated
      ? `<span class="doc-card-date">${escapeHtml(messages.updated)} ${escapeHtml(formatDocDate(doc.updated_at, locale))}</span>`
      : "";

  const description = (doc: PublicDocSummary): string =>
    view.showDescription && doc.description
      ? `<span class="muted">${escapeHtml(doc.description)}</span>`
      : "";

  const renderItems = (items: PublicDocSummary[]): string => {
    if (view.style === "list") {
      const rows = items
        .map(
          (doc) =>
            `<li${searchAttr(doc)}><a href="${docHref(doc, ctx)}"><span class="title">${escapeHtml(doc.title)}</span>${description(doc)}${meta(doc)}</a></li>`,
        )
        .join("");
      return `<ul class="doc-list-rows">${rows}</ul>`;
    }
    const cards = items
      .map(
        (doc) =>
          `<li${searchAttr(doc)}><a class="card doc-card" href="${docHref(doc, ctx)}"><span class="title">${escapeHtml(doc.title)}</span>${description(doc)}${meta(doc)}</a></li>`,
      )
      .join("");
    return `<ul class="${gridClass(view.columns)}">${cards}</ul>`;
  };

  const groups = view.groups
    .map(
      (group) =>
        `<div class="doc-list-group">${
          group.category
            ? `<h3 class="doc-list-group-title">${escapeHtml(group.category_label)}</h3>`
            : ""
        }${renderItems(group.items)}</div>`,
    )
    .join("");

  const indexPath = docsCtx?.docsIndexPath ?? "/docs";
  const indexHref =
    ctx.locale && ctx.defaultLocale
      ? withSiteLocale(indexPath, ctx.locale, ctx.defaultLocale)
      : indexPath;
  const chip = query
    ? filterChip(query, locale, indexHref, filtered.length)
    : "";

  return `${sectionHeading(section.settings)}
  ${chip}
  <div class="doc-list">${groups}</div>`;
};
