import { type ReactElement } from "react";

import { useSiteLocale } from "../../../../../marketing/client/components/sections/site-locale-context.js";
import { settingBool, settingText } from "../../../../../marketing/shared/section-schema.js";

import { docMessages, extractDocHeadings } from "../../../../shared/site-doc.js";
import { readSiteDocsContext } from "../../../../shared/site-docs-context.js";

import type { SectionViewProps } from "../../../../../marketing/client/components/sections/section-parts.js";

type Props = SectionViewProps & {
  contributed?: Readonly<Record<string, unknown>>;
};

export function SiteDocsTocSection(props: Props): ReactElement | null {
  const { section } = props;
  const locale = useSiteLocale();
  const doc = readSiteDocsContext(props)?.doc;
  if (!doc) return null;
  const s = section.settings;
  const headings = extractDocHeadings(doc.body_md, {
    min: 2,
    max: settingText(s, "depth") === "2" ? 2 : 3,
  });
  if (headings.length === 0) return null;
  const heading = settingText(s, "heading") || docMessages(locale).toc;

  return (
    <nav
      className={`doc-toc${settingBool(s, "sticky") ? " is-sticky" : ""}`}
      aria-label={heading}
    >
      <p className="doc-toc-title">{heading}</p>
      <ul>
        {headings.map((item) => (
          <li key={item.anchor} className={`doc-toc-l${item.level}`}>
            <a href={`#${item.anchor}`}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
