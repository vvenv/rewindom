import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { ButtonRow, type SectionViewProps } from "../section-parts.js";

export function PageMissingSection({ section }: SectionViewProps): ReactElement {
  const s = section.settings;
  const code = settingText(s, "code") || "404";
  const headline = settingText(s, "headline");
  const subhead = settingText(s, "subhead");

  return (
    <div className="page-missing">
      <p className="page-missing-code" aria-hidden="true">
        {code}
      </p>
      {headline ? <h1>{headline}</h1> : null}
      {subhead ? <p className="lead">{subhead}</p> : null}
      <ButtonRow settings={s} align="center" />
    </div>
  );
}
