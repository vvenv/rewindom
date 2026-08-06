import { type CSSProperties, type ReactElement } from "react";

import {
  resolveSurfaceStyle,
  settingText,
  surfaceStyleCss,
} from "../../../../shared/section-schema.js";
import { SectionHeading, type SectionViewProps } from "../section-parts.js";

export function FaqSection({ section }: SectionViewProps): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;

  return (
    <>
      <SectionHeading settings={s} />
      <dl className="spec">
        {section.blocks.map((block) => {
          const answer = settingText(block.settings, "answer");
          const surface = resolveSurfaceStyle(block.settings);
          return (
            <div
              key={block.id}
              data-block-id={block.id}
              className="qa"
              style={surfaceStyleCss(surface) as CSSProperties}
            >
              <dt>{settingText(block.settings, "question")}</dt>
              {answer ? <dd>{answer}</dd> : null}
            </div>
          );
        })}
      </dl>
    </>
  );
}
