import { type ReactElement } from "react";

import {
  docMessages,
  extractDocHeadings,
} from "../../../../shared/marketing-doc.js";
import {
  settingBool,
  settingText,
} from "../../../../shared/section-schema.js";
import { type SectionViewProps } from "../section-parts.js";
import { useSiteLocale } from "../site-locale-context.js";

export function DocTocSection({
  section,
  doc,
}: SectionViewProps): ReactElement | null {
  const locale = useSiteLocale();
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
            {/* 页内锚点，不走 SiteLink（那是给站内路径补 locale 前缀的） */}
            <a href={`#${item.anchor}`}>{item.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
