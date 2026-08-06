import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { ButtonRow, type SectionViewProps } from "../section-parts.js";

export function HeroSection({ section }: SectionViewProps): ReactElement {
  const s = section.settings;
  const align = settingText(s, "align");
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");

  return (
    <div className={`hero${align === "center" ? " center" : ""}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{settingText(s, "headline")}</h1>
      {subhead ? <p className="lead">{subhead}</p> : null}
      <ButtonRow settings={s} align={align} />
      {section.blocks.length > 0 ? (
        <dl className="stats">
          {section.blocks.map((block) => (
            <div key={block.id} data-block-id={block.id}>
              <dt>{settingText(block.settings, "term")}</dt>
              <dd>{settingText(block.settings, "detail")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
