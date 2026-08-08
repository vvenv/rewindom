import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { SectionHeading, type SectionViewProps } from "../section-parts.js";
import { SiteLink } from "../SiteLink.js";

export function SpecListSection({
  section,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const stacked = settingText(s, "layout") === "stacked";
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const label = settingText(s, "primary_label");
  const href = settingText(s, "primary_href");

  const rows = (
    <dl className="spec">
      {section.blocks.map((block) => (
        <div key={block.id} data-block-id={block.id} className="spec-row">
          <dt>{settingText(block.settings, "term")}</dt>
          <dd>{settingText(block.settings, "detail")}</dd>
        </div>
      ))}
    </dl>
  );

  if (stacked) {
    return (
      <>
        <SectionHeading settings={s} action />
        {rows}
      </>
    );
  }

  return (
    <div className="split">
      <div>
        {heading ? <h2>{heading}</h2> : null}
        {subheading ? <p className="lead">{subheading}</p> : null}
        {label && href ? (
          <p>
            <SiteLink href={href} className="btn btn-secondary">
              {label}
            </SiteLink>
          </p>
        ) : null}
      </div>
      {rows}
    </div>
  );
}
