import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { ButtonRow, type SectionViewProps } from "../section-parts.js";

export function BandSection({ section }: SectionViewProps): ReactElement {
  const s = section.settings;
  const body = settingText(s, "body");
  const align = settingText(s, "align");

  return (
    <div className={`band${align === "center" ? " center" : ""}`}>
      <h2>{settingText(s, "headline")}</h2>
      {body ? <p className="lead">{body}</p> : null}
      <ButtonRow settings={s} align={align} />
    </div>
  );
}
