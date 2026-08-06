import { type ReactElement } from "react";

import {
  resolvePageHeaderText,
  settingText,
} from "../../../../shared/section-schema.js";

import type { SectionViewProps } from "../section-parts.js";

export function PageHeaderSection({
  section,
  pages,
  currentPath,
}: SectionViewProps): ReactElement | null {
  const page = pages.find((item) => item.path === currentPath);
  const { headline, subhead } = resolvePageHeaderText(section.settings, page);
  if (!headline && !subhead) return null;
  const centered = settingText(section.settings, "align") === "center";

  return (
    <div
      className="page-head"
      style={centered ? { textAlign: "center" } : undefined}
    >
      {headline ? <h1>{headline}</h1> : null}
      {subhead ? <p>{subhead}</p> : null}
    </div>
  );
}
