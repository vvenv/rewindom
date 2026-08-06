import { type ReactElement } from "react";

import {
  settingBool,
  settingIcon,
  settingNumber,
  settingText,
} from "../../../../shared/section-schema.js";
import { SECTION_ICON_COMPONENTS } from "../section-icons.js";
import {
  blockCardProps,
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";

export function FeatureGridSection({
  section,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const showIcons = settingBool(s, "show_icons");

  return (
    <>
      <SectionHeading settings={s} />
      <ul className={gridClass(settingNumber(s, "columns", 3))}>
        {section.blocks.map((block) => {
          const Icon =
            SECTION_ICON_COMPONENTS[settingIcon(block.settings, "icon")];
          const body = settingText(block.settings, "body");
          const card = blockCardProps(block.settings);
          return (
            <li
              key={block.id}
              data-block-id={block.id}
              className={card.className}
              style={card.style}
            >
              {showIcons ? (
                <span className="card-icon">
                  <Icon className="icon" aria-hidden />
                </span>
              ) : null}
              <p className="title">{settingText(block.settings, "title")}</p>
              {body ? <p className="muted">{body}</p> : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
