import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { MarkdownBlock, type SectionViewProps } from "../section-parts.js";

export function ProseSection({
  section,
}: SectionViewProps): ReactElement | null {
  return <MarkdownBlock body_md={settingText(section.settings, "body_md")} />;
}
