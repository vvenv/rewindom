import { type ReactElement } from "react";

import {
  DOCS_INDEX_PATH,
  docMessages,
  formatDocDate,
} from "../../../../shared/marketing-doc.js";
import { settingBool, settingText } from "../../../../shared/section-schema.js";
import { MarkdownProse } from "../../MarkdownProse.js";
import { type SectionViewProps } from "../section-parts.js";
import { useSiteLocale } from "../site-locale-context.js";
import { SiteLink } from "../SiteLink.js";

export function DocArticleSection({
  section,
  doc,
}: SectionViewProps): ReactElement | null {
  const locale = useSiteLocale();
  if (!doc) return null;
  const s = section.settings;
  const messages = docMessages(locale);

  const showCategory = settingBool(s, "show_category") && Boolean(doc.category);
  const showUpdated = settingBool(s, "show_updated");
  const meta =
    showCategory || showUpdated ? (
      <div className="doc-article-meta">
        {showCategory ? <span className="doc-tag">{doc.category_label}</span> : null}
        {showUpdated ? (
          <span>
            {messages.updated} {formatDocDate(doc.updated_at, locale)}
          </span>
        ) : null}
      </div>
    ) : null;
  const below = settingText(s, "meta_position") === "below";

  return (
    <article
      className={
        settingText(s, "align") === "center"
          ? "doc-article doc-article-center"
          : "doc-article"
      }
    >
      {settingBool(s, "show_back") ? (
        <SiteLink
          href={settingText(s, "back_href") || DOCS_INDEX_PATH}
          className="doc-article-back"
        >
          ← {settingText(s, "back_label") || messages.back}
        </SiteLink>
      ) : null}
      {below ? null : meta}
      {settingBool(s, "show_title") ? <h1>{doc.title}</h1> : null}
      {settingBool(s, "show_description") && doc.description ? (
        <p className="doc-article-lead">{doc.description}</p>
      ) : null}
      {below ? meta : null}
      {/* MarkdownProse 自带 `.prose` 外壳，与 SSR 的 `<div class="prose">` 对齐 */}
      <MarkdownProse markdown={doc.body_md} />
    </article>
  );
}
