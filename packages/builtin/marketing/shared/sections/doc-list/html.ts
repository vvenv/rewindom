import { escapeHtml } from "../../html.js";
import {
  docMessages,
  docPath,
  formatDocDate,
  type PublicDocSummary,
} from "../../marketing-doc.js";
import { withSiteLocale } from "../../site-locale.js";
import { gridClass, sectionHeading } from "../_common/html.js";

import { docSearchHaystack, resolveDocList } from "./select.js";

import type {
  SectionHtmlRenderer,
  SectionRenderContext,
} from "../render-context.js";

function docHref(doc: PublicDocSummary, ctx: SectionRenderContext): string {
  const path = docPath(doc.slug);
  return escapeHtml(
    ctx.locale && ctx.defaultLocale
      ? withSiteLocale(path, ctx.locale, ctx.defaultLocale)
      : path,
  );
}

/** 可搜索文本挂在条目上，供公开站的增强脚本（无 React）就地过滤。 */
function searchAttr(doc: PublicDocSummary): string {
  return ` data-doc-search="${escapeHtml(docSearchHaystack(doc))}"`;
}

export const renderDocListHtml: SectionHtmlRenderer = (section, ctx) => {
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);
  const view = resolveDocList(section.settings, ctx.docs ?? []);
  // 一篇都没有时整段不输出，与 page-menu 同口径：空目录不该占一块空白
  if (view.groups.length === 0) return "";

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

  /*
   * 每一组都套 `.doc-list-group`，没有分类的那一组只是少一行标题——组间距挂在
   * 相邻的两个壳之间，散条目要是不套壳就会紧贴着上一组的卡片。
   */
  const groups = view.groups
    .map(
      (group) =>
        `<div class="doc-list-group">${
          group.category
            ? `<h3 class="doc-list-group-title">${escapeHtml(group.category)}</h3>`
            : ""
        }${renderItems(group.items)}</div>`,
    )
    .join("");

  /*
   * 段内不再自带搜索框：文档搜索的唯一入口是页头（`show_doc_search`）。
   *
   * 两个一模一样的框曾经同时出现在文档索引上——页头那个跳过来 `?q=`，落进段里
   * 这个。现在段只负责列，`?q=` 由 `site-enhance` 在列表上方画一枚可清除的筛选标签。
   */
  return `${sectionHeading(section.settings)}
  <div class="doc-list">${groups}</div>`;
};
