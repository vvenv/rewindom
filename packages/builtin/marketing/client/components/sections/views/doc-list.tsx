import { type ReactElement, type ReactNode } from "react";

import {
  docMessages,
  docPath,
  formatDocDate,
  type PublicDocSummary,
} from "../../../../shared/marketing-doc.js";
import {
  docSearchHaystack,
  resolveDocList,
} from "../../../../shared/sections/doc-list/select.js";
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
  const view = resolveDocList(section.settings, docs);
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
      {/*
        段内不再自带搜索框：文档搜索的唯一入口是页头。编辑器预览里同样没有，
        与线上一致——`?q=` 的筛选标签是 `site-enhance` 在公开站上画的。
      */}
      <div className="doc-list">
        {/* 没有分类的那一组照样套壳、只是少一行标题——组间距挂在相邻两个壳之间 */}
        {view.groups.map((group) => (
          <div className="doc-list-group" key={group.category || "loose"}>
            {group.category ? (
              <h3 className="doc-list-group-title">{group.category}</h3>
            ) : null}
            {items(group.items)}
          </div>
        ))}
      </div>
    </>
  );
}
