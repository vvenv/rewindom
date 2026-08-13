import { type ReactElement, type ReactNode } from "react";

import {
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../../../../../marketing/client/components/sections/section-parts.js";
import { useSiteLocale } from "../../../../../marketing/client/components/sections/site-locale-context.js";
import { SiteLink } from "../../../../../marketing/client/components/sections/SiteLink.js";

import {
  docMessages,
  docPath,
  formatDocDate,
  type PublicDocSummary,
} from "../../../../shared/site-doc.js";
import { readSiteDocsContext } from "../../../../shared/site-docs-context.js";
import {
  docSearchHaystack,
  resolveDocList,
} from "../../../../shared/sections/list/select.js";

type Props = SectionViewProps & {
  contributed?: Readonly<Record<string, unknown>>;
};

export function SiteDocsListSection(props: Props): ReactElement | null {
  const { section } = props;
  const locale = useSiteLocale();
  const messages = docMessages(locale);
  const docsCtx = readSiteDocsContext(props);
  const docs = docsCtx?.docs ?? [];
  const query = docsCtx?.query?.trim() ?? "";
  const needle = query.toLowerCase();
  const filtered = needle
    ? docs.filter((doc) => docSearchHaystack(doc).includes(needle))
    : docs;
  const view = resolveDocList(section.settings, filtered);
  if (view.groups.length === 0 && !query) return null;

  const description = (doc: PublicDocSummary): ReactNode =>
    view.showDescription && doc.description ? (
      <span className="muted">{doc.description}</span>
    ) : null;

  const date = (doc: PublicDocSummary): ReactNode =>
    view.showUpdated ? (
      <span className="doc-card-date">
        {messages.updated} {formatDocDate(doc.updated_at, locale)}
      </span>
    ) : null;

  const items = (list: PublicDocSummary[]): ReactElement =>
    view.style === "list" ? (
      <ul className="doc-list-rows">
        {list.map((doc) => (
          <li key={doc.slug} data-doc-search={docSearchHaystack(doc)}>
            <SiteLink href={docPath(doc.slug)}>
              <span className="title">{doc.title}</span>
              {description(doc)}
              {date(doc)}
            </SiteLink>
          </li>
        ))}
      </ul>
    ) : (
      <ul className={gridClass(view.columns)}>
        {list.map((doc) => (
          <li key={doc.slug} data-doc-search={docSearchHaystack(doc)}>
            <SiteLink href={docPath(doc.slug)} className="card doc-card">
              <span className="title">{doc.title}</span>
              {description(doc)}
              {date(doc)}
            </SiteLink>
          </li>
        ))}
      </ul>
    );

  return (
    <>
      <SectionHeading settings={section.settings} />
      <div className="doc-list">
        {view.groups.map((group) => (
          <div className="doc-list-group" key={group.category || "loose"}>
            {group.category ? (
              <h3 className="doc-list-group-title">{group.category_label}</h3>
            ) : null}
            {items(group.items)}
          </div>
        ))}
      </div>
    </>
  );
}
