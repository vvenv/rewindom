import { type ReactElement } from "react";

import {
  settingNumber,
  settingText,
} from "../../../../shared/section-schema.js";
import {
  PAGE_MENU_SOURCES,
  resolvePageMenu,
  type PageMenuSource,
} from "../../../../shared/site-cms.js";
import {
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";
import { SiteLink } from "../SiteLink.js";

export function PageMenuSection({
  section,
  pages,
  currentPath,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  const rawSource = settingText(s, "source") || "children";
  const source: PageMenuSource = (
    PAGE_MENU_SOURCES as readonly string[]
  ).includes(rawSource)
    ? (rawSource as PageMenuSource)
    : "children";
  const style = settingText(s, "style") || "cards";
  const menu = resolvePageMenu(pages, currentPath, source);
  if (menu.items.length === 0) return null;

  if (style === "list") {
    return (
      <>
        <SectionHeading settings={s} />
        <nav className="page-menu-list" aria-label={menu.title || "Pages"}>
          <ul>
            {menu.items.map((page) => (
              <li
                key={page.path}
                aria-current={page.path === currentPath ? "page" : undefined}
              >
                <SiteLink href={page.path}>{page.title}</SiteLink>
              </li>
            ))}
          </ul>
        </nav>
      </>
    );
  }

  return (
    <>
      <SectionHeading settings={s} />
      <ul className={gridClass(settingNumber(s, "columns", 2))}>
        {menu.items.map((page) => (
          <li key={page.path}>
            <SiteLink href={page.path} className="card">
              <span className="title">{page.title}</span>
              {page.description ? (
                <span className="muted">{page.description}</span>
              ) : null}
            </SiteLink>
          </li>
        ))}
      </ul>
    </>
  );
}
