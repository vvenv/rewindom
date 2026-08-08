import { type ReactElement } from "react";

import {
  settingBool,
  settingNumber,
  settingText,
} from "../../../../shared/section-schema.js";
import {
  blockCardProps,
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";

export function StepsSection({
  section,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const showNumber = settingBool(s, "show_number");

  return (
    <>
      <SectionHeading settings={s} action />
      <ol className={gridClass(settingNumber(s, "columns", 3))}>
        {section.blocks.map((block, index) => {
          const body = settingText(block.settings, "body");
          const code = settingText(block.settings, "code");
          const card = blockCardProps(block.settings);
          return (
            <li
              key={block.id}
              data-block-id={block.id}
              className={card.className}
              style={card.style}
            >
              {showNumber ? (
                <span className="eyebrow">
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : null}
              <p className="title">{settingText(block.settings, "title")}</p>
              {body ? <p className="muted">{body}</p> : null}
              {code ? <code>{code}</code> : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
