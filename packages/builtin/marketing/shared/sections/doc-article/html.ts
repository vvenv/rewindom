import { escapeHtml } from "../../html.js";
import {
  DOCS_INDEX_PATH,
  docMessages,
  formatDocDate,
} from "../../marketing-doc.js";
import { settingBool, settingText } from "../../section-schema.js";
import { withSiteLocale } from "../../site-locale.js";
import { isExternal, linkAttrs, md } from "../_common/html.js";

import type { SectionHtmlRenderer } from "../render-context.js";

export const renderDocArticleHtml: SectionHtmlRenderer = (section, ctx) => {
  const doc = ctx.doc;
  // 不在详情模板页上（索引页、普通页面）就没有「当前文档」——整段不输出
  if (!doc) return "";
  const s = section.settings;
  const locale = ctx.locale ?? "en";
  const messages = docMessages(locale);

  let back = "";
  if (settingBool(s, "show_back")) {
    const target =
      settingText(s, "back_href") || ctx.docsIndexPath || DOCS_INDEX_PATH;
    // 站内地址补当前语言前缀（同客户端 `SiteLink`）；外链 / 锚点原样输出
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
