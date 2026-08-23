import { type ReactElement, type ReactNode } from "react";

import {
  isIconImageUrl,
  settingText,
  type SiteBlock,
} from "../../../../shared/section-schema.js";
import { SectionHeading, type SectionViewProps } from "../section-parts.js";
import { SiteLink } from "../SiteLink.js";

function BadgeImages({ block }: { block: SiteBlock }): ReactElement | null {
  const image = settingText(block.settings, "image").trim();
  if (!isIconImageUrl(image)) return null;
  const dark = settingText(block.settings, "image_dark").trim();
  const hasDark = isIconImageUrl(dark);
  const href = settingText(block.settings, "href").trim();
  const alt = settingText(block.settings, "alt").trim();
  const imgAlt = href ? "" : alt;
  const images: ReactNode = (
    <>
      <img
        className={hasDark ? "bdg-img bdg-img-light" : "bdg-img"}
        src={image}
        alt={imgAlt}
      />
      {hasDark ? (
        <img className="bdg-img bdg-img-dark" src={dark} alt={imgAlt} />
      ) : null}
    </>
  );
  if (href) {
    return (
      <SiteLink
        href={href}
        className="bdg-item"
        blockId={block.id}
        aria-label={alt || undefined}
      >
        {images}
      </SiteLink>
    );
  }
  return (
    <span className="bdg-item" data-block-id={block.id}>
      {images}
    </span>
  );
}

export function BadgesSection({
  section,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  const align = settingText(s, "align");
  const items = section.blocks.flatMap((block) => {
    const image = settingText(block.settings, "image").trim();
    if (!isIconImageUrl(image)) return [];
    return [<BadgeImages key={block.id} block={block} />];
  });
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  if (items.length === 0 && !heading && !subheading) return null;
  const hasDark = section.blocks.some((block) =>
    isIconImageUrl(settingText(block.settings, "image_dark").trim()),
  );
  const classes = [
    "bdg",
    align === "center" ? "center" : "",
    hasDark ? "has-dark" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <SectionHeading settings={s} />
      {items.length > 0 ? <div className={classes}>{items}</div> : null}
    </>
  );
}
