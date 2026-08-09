import { escapeHtml } from "../../html.js";
import {
  DOCS_INDEX_PATH,
  docMessages,
  formatDocDate,
} from "../../marketing-doc.js";
import { settingBool } from "../../section-schema.js";
import { withSiteLocale } from "../../site-locale.js";
import { md } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderDocArticleHtml: SectionHtmlRenderer = (section, ctx) => {
  const doc = ctx.doc;
  // 不在详情模板页上（索引页、普通页面）就没有「当前文档」——整段不输出
  if (!doc) return "";
  const s = section.settings;
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);

  const indexPath = ctx.docsIndexPath ?? DOCS_INDEX_PATH;
  const backHref =
    ctx.locale && ctx.defaultLocale
      ? withSiteLocale(indexPath, ctx.locale, ctx.defaultLocale)
      : indexPath;
  const back = settingBool(s, "show_back")
    ? `<a class="doc-article-back" href="${escapeHtml(backHref)}">← ${escapeHtml(messages.back)}</a>`
    : "";

  const meta = settingBool(s, "show_meta")
    ? `<div class="doc-article-meta">${
        doc.category ? `<span class="doc-tag">${escapeHtml(doc.category)}</span>` : ""
      }<span>${escapeHtml(messages.updated)} ${escapeHtml(formatDocDate(doc.updated_at, locale))}</span></div>`
    : "";

  const title = settingBool(s, "show_title")
    ? `<h1>${escapeHtml(doc.title)}</h1>`
    : "";
  const lead =
    settingBool(s, "show_description") && doc.description
      ? `<p class="doc-article-lead">${escapeHtml(doc.description)}</p>`
      : "";

  return `<article class="doc-article">
  ${back}
  ${meta}
  ${title}
  ${lead}
  <div class="prose">${md(doc.body_md)}</div>
</article>`;
};
