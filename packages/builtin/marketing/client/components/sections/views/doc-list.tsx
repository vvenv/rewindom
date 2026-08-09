import { Fragment, type ReactElement, type ReactNode } from "react";

import {
  docMessages,
  docPath,
  formatDocDate,
  type PublicDocSummary,
} from "../../../../shared/marketing-doc.js";
import { resolveDocList } from "../../../../shared/sections/doc-list/select.js";
import {
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";
import { useSiteLocale } from "../site-locale-context.js";
import { SiteLink } from "../SiteLink.js";

export function DocListSection({
  section,
  docs,
}: SectionViewProps): ReactElement | null {
  const locale = useSiteLocale();
  const messages = docMessages(locale);
  const view = resolveDocList(section.settings, docs, messages.otherCategory);
  if (view.groups.length === 0) return null;

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
          <li key={doc.slug}>
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
          <li key={doc.slug}>
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
        {view.groups.map((group) =>
          group.category ? (
            <div className="doc-list-group" key={group.category}>
              <h3 className="doc-list-group-title">{group.category}</h3>
              {items(group.items)}
            </div>
          ) : (
            // 不分组时 SSR 也是直接吐列表，不多包一层：结构必须逐层一致
            <Fragment key="all">{items(group.items)}</Fragment>
          ),
        )}
      </div>
    </>
  );
}
