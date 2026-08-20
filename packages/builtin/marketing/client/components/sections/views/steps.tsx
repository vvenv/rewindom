import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { SectionHeading, type SectionViewProps } from "../section-parts.js";

export function StepsSection({ section }: SectionViewProps): ReactElement {
  const showNumber = section.settings.show_number !== false;

  return (
    <>
      <SectionHeading settings={section.settings} />
      <ol className="steps">
        {section.blocks.map((block, index) => {
          const body = settingText(block.settings, "body");
          return (
            <li key={block.id} className="step" data-block-id={block.id}>
              {showNumber ? (
                <span className="step-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : null}
              <div className="step-body">
                <p className="title">{settingText(block.settings, "title")}</p>
                {body ? <p className="muted">{body}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
