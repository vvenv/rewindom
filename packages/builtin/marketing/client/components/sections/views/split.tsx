import { type ReactElement } from "react";

import { settingText } from "../../../../shared/section-schema.js";
import { MarkdownProse } from "../../MarkdownProse.js";
import { ButtonRow, type SectionViewProps } from "../section-parts.js";

function SplitMedia({
  image,
  alt,
  panel,
}: {
  image: string;
  alt: string;
  panel: string;
}): ReactElement {
  if (image) {
    return (
      <div className="spl-media">
        <img src={image} alt={alt} />
      </div>
    );
  }
  if (panel) {
    return (
      <div className="spl-media">
        <div className="spl-panel prose">
          <MarkdownProse markdown={panel} />
        </div>
      </div>
    );
  }
  return (
    <div className="spl-media">
      <div className="spl-deco" aria-hidden="true" />
    </div>
  );
}

export function SplitSection({ section }: SectionViewProps): ReactElement {
  const s = section.settings;
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const body = settingText(s, "body");
  const side = settingText(s, "media_side") === "left" ? " media-left" : "";

  return (
    <div className={`spl${side}`}>
      <div className="spl-copy">
        {heading ? <h2>{heading}</h2> : null}
        {subheading ? <p className="lead">{subheading}</p> : null}
        {body ? <p className="lead">{body}</p> : null}
        <ButtonRow settings={s} align="left" />
      </div>
      <SplitMedia
        image={settingText(s, "image")}
        alt={settingText(s, "image_alt")}
        panel={settingText(s, "panel_md")}
      />
    </div>
  );
}
