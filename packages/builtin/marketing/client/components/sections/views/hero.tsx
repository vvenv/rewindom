import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { ButtonRow, type SectionViewProps } from "../section-parts.js";

function HeroMedia({
  image,
  alt,
}: {
  image: string;
  alt: string;
}): ReactElement {
  return (
    <div className="hero-media">
      {image ? (
        <img src={image} alt={alt} />
      ) : (
        <div className="hero-media-deco" aria-hidden="true" />
      )}
    </div>
  );
}

export function HeroSection({ section }: SectionViewProps): ReactElement {
  const s = section.settings;
  const align = settingText(s, "align");
  const split = settingText(s, "layout") === "split";
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");
  const classes = [
    "hero",
    align === "center" ? "center" : "",
    split ? "hero-split" : "",
    split && settingText(s, "media_side") === "left" ? "media-left" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <div className="hero-copy">
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
      {split ? (
        <HeroMedia
          image={settingText(s, "image")}
          alt={settingText(s, "image_alt")}
        />
      ) : null}
    </div>
  );
}
