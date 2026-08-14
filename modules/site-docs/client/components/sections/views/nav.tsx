import { type ReactElement } from "react";

import { useSiteLocale } from "@rewindom/builtin/marketing/client/components/sections/site-locale-context.js";
import { SiteLink } from "@rewindom/builtin/marketing/client/components/sections/SiteLink.js";
import { settingBool, settingText } from "@rewindom/builtin/marketing/shared/section-schema.js";

import {
  docMessages,
  docPath,
  groupDocsByCategory,
  type PublicDocSummary,
} from "../../../../shared/site-doc.js";
import { readSiteDocsContext } from "../../../../shared/site-docs-context.js";

import type { SectionViewProps } from "@rewindom/builtin/marketing/client/components/sections/section-parts.js";

type Props = SectionViewProps & {
  contributed?: Readonly<Record<string, unknown>>;
};

export function SiteDocsNavSection(props: Props): ReactElement | null {
  const { section, currentPath } = props;
  const locale = useSiteLocale();
  const docs = readSiteDocsContext(props)?.docs ?? [];
  if (docs.length === 0) return null;
  const s = section.settings;
  const messages = docMessages(locale);
  const heading = settingText(s, "heading");
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
