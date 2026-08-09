import { type ReactElement } from "react";

import {
  DOCS_INDEX_PATH,
  docMessages,
  formatDocDate,
} from "../../../../shared/marketing-doc.js";
import { settingBool } from "../../../../shared/section-schema.js";
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

  return (
    <article className="doc-article">
      {settingBool(s, "show_back") ? (
        <SiteLink href={DOCS_INDEX_PATH} className="doc-article-back">
          ← {messages.back}
        </SiteLink>
      ) : null}
      {settingBool(s, "show_meta") ? (
        <div className="doc-article-meta">
          {doc.category ? <span className="doc-tag">{doc.category}</span> : null}
          <span>
            {messages.updated} {formatDocDate(doc.updated_at, locale)}
          </span>
        </div>
      ) : null}
      {settingBool(s, "show_title") ? <h1>{doc.title}</h1> : null}
      {settingBool(s, "show_description") && doc.description ? (
        <p className="doc-article-lead">{doc.description}</p>
      ) : null}
      {/* MarkdownProse 自带 `.prose` 外壳，与 SSR 的 `<div class="prose">` 对齐 */}
      <MarkdownProse markdown={doc.body_md} />
    </article>
  );
}
