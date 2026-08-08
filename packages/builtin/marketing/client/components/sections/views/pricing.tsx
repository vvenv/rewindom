import { type CSSProperties, type ReactElement } from "react";

import {
  resolveSurfaceStyle,
  settingBool,
  settingLines,
  settingNumber,
  settingText,
  surfaceStyleCss,
} from "../../../../shared/section-schema.js";
import {
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";
import { SiteLink } from "../SiteLink.js";

export function PricingSection({
  section,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const footnote = settingText(s, "footnote");
  const badge = settingText(s, "featured_badge");

  return (
    <>
      <SectionHeading settings={s} />
      <ul className={`${gridClass(settingNumber(s, "columns", 3))} plans`}>
        {section.blocks.map((block) => {
          const b = block.settings;
          const featured = settingBool(b, "featured");
          const audience = settingText(b, "audience");
          const priceNote = settingText(b, "price_note");
          const label = settingText(b, "primary_label");
          const href = settingText(b, "primary_href");
          const surface = resolveSurfaceStyle(b);
          return (
            <li
              key={block.id}
              data-block-id={block.id}
              className={`plan${featured ? " featured" : ""}`}
              style={surfaceStyleCss(surface) as CSSProperties}
            >
              {featured && badge ? (
                <span className="badge">{badge}</span>
              ) : null}
              <h3>{settingText(b, "name")}</h3>
              {audience ? <p className="muted">{audience}</p> : null}
              <p className="price">{settingText(b, "price")}</p>
              {priceNote ? <p className="muted">{priceNote}</p> : null}
              {settingLines(b, "highlights").length > 0 ? (
                <ul className="checks">
                  {settingLines(b, "highlights").map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {label && href ? (
                <SiteLink
                  href={href}
                  className={`btn${featured ? "" : " btn-secondary"} btn-block`}
                >
                  {label}
                </SiteLink>
              ) : null}
            </li>
          );
        })}
      </ul>
      {footnote ? <p className="muted">{footnote}</p> : null}
    </>
  );
}
