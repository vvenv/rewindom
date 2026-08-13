import { type ReactElement } from "react";

import { MarkdownProse } from "../../../../../marketing/client/components/MarkdownProse.js";
import { useSiteLocale } from "../../../../../marketing/client/components/sections/site-locale-context.js";
import { SiteLink } from "../../../../../marketing/client/components/sections/SiteLink.js";
import { settingBool, settingText } from "../../../../../marketing/shared/section-schema.js";

import {
  DOCS_INDEX_PATH,
  docMessages,
  formatDocDate,
} from "../../../../shared/site-doc.js";
import { readSiteDocsContext } from "../../../../shared/site-docs-context.js";

import type { SectionViewProps } from "../../../../../marketing/client/components/sections/section-parts.js";

type Props = SectionViewProps & {
  contributed?: Readonly<Record<string, unknown>>;
};

export function SiteDocsArticleSection(props: Props): ReactElement | null {
  const { section } = props;
  const locale = useSiteLocale();
  const doc = readSiteDocsContext(props)?.doc;
  if (!doc) return null;
  const s = section.settings;
  const messages = docMessages(locale);
  const docsIndexPath =
    readSiteDocsContext(props)?.docsIndexPath ?? DOCS_INDEX_PATH;

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
          href={settingText(s, "back_href") || docsIndexPath}
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
      <div className="prose">
        <MarkdownProse markdown={doc.body_md} />
      </div>
    </article>
  );
}
