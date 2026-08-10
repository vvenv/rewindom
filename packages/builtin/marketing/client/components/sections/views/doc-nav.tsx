import { type ReactElement } from "react";

import {
  docMessages,
  docPath,
  groupDocsByCategory,
  type PublicDocSummary,
} from "../../../../shared/marketing-doc.js";
import {
  settingBool,
  settingText,
} from "../../../../shared/section-schema.js";
import { type SectionViewProps } from "../section-parts.js";
import { useSiteLocale } from "../site-locale-context.js";
import { SiteLink } from "../SiteLink.js";

export function DocNavSection({
  section,
  docs,
  currentPath,
}: SectionViewProps): ReactElement | null {
  const locale = useSiteLocale();
  if (docs.length === 0) return null;
  const s = section.settings;
  const messages = docMessages(locale);
  const heading = settingText(s, "heading");
  /*
   * 分组只在真的分开了东西时才画标题，没填分类的那一组不套标题——
   * 与 SSR 的 `doc-nav/html.ts` 同一口径，两端结构必须逐层一致。
   */
  const groups = settingBool(s, "show_category")
    ? groupDocsByCategory(docs)
    : [];

  const list = (items: readonly PublicDocSummary[]): ReactElement => (
    <ul>
      {items.map((doc) => (
        <li key={doc.slug}>
          <SiteLink
            href={docPath(doc.slug)}
            aria-current={docPath(doc.slug) === currentPath ? "page" : undefined}
          >
            {doc.title}
          </SiteLink>
        </li>
      ))}
    </ul>
  );

  return (
    <nav
      className={`doc-nav${settingBool(s, "sticky") ? " is-sticky" : ""}`}
      aria-label={heading || messages.nav}
    >
      {heading ? <p className="doc-nav-title">{heading}</p> : null}
      {groups.length > 1
        ? groups.map((group) => (
            <div className="doc-nav-group" key={group.category || "loose"}>
              {group.category ? (
                <p className="doc-nav-group-title">{group.category_label}</p>
              ) : null}
              {list(group.items)}
            </div>
          ))
        : list(docs)}
    </nav>
  );
}
