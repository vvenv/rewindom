import { type ReactElement } from "react";

import {
  settingNumber,
  settingText,
  type SiteBlock,
} from "../../../../shared/section-schema.js";
import {
  blockCardProps,
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";
import { SiteLink } from "../SiteLink.js";

function CardBlock({
  block,
  style,
}: {
  block: SiteBlock;
  style: string;
}): ReactElement {
  const plain = style === "plain";
  const card = blockCardProps(block.settings, plain);

  if (block.type === "stat") {
    const label = settingText(block.settings, "label");
    return (
      <li data-block-id={block.id} className={card.className} style={card.style}>
        <strong className="stat-value">
          {settingText(block.settings, "value")}
        </strong>
        {label ? <p className="muted">{label}</p> : null}
      </li>
    );
  }

  const body = settingText(block.settings, "body");
  const href = settingText(block.settings, "href");
  const inner = (
    <>
      <span className="title">{settingText(block.settings, "title")}</span>
      {body ? <span className="muted">{body}</span> : null}
    </>
  );

  if (href) {
    return (
      <li data-block-id={block.id}>
        <SiteLink href={href} className={card.className} style={card.style}>
          {inner}
        </SiteLink>
      </li>
    );
  }

  return (
    <li data-block-id={block.id} className={card.className} style={card.style}>
      {inner}
    </li>
  );
}

export function CardsSection({
  section,
}: SectionViewProps): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const style = settingText(s, "card_style");

  return (
    <>
      <SectionHeading settings={s} />
      <ul className={gridClass(settingNumber(s, "columns", 3))}>
        {section.blocks.map((block) => (
          <CardBlock key={block.id} block={block} style={style} />
        ))}
      </ul>
    </>
  );
}
