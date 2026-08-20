import { type ReactElement } from "react";

import {
  resolveSettingIcon,
  settingIcon,
  settingNumber,
  settingText,
} from "../../../../shared/section-schema.js";
import { SettingIconMark } from "../section-icons.js";
import {
  gridClass,
  SectionHeading,
  type SectionViewProps,
} from "../section-parts.js";
import { SiteLink } from "../SiteLink.js";

export function FeatureGridSection({
  section,
}: SectionViewProps): ReactElement {
  const s = section.settings;
  const plain = settingText(s, "card_style") === "plain";
  const showIcons = s.show_icons !== false;
  const className = `card${plain ? " card-plain" : ""}`;

  return (
    <>
      <SectionHeading settings={s} />
      <div className={`fg ${gridClass(settingNumber(s, "columns", 3))}`}>
        {section.blocks.map((block) => {
          const title = settingText(block.settings, "title");
          const body = settingText(block.settings, "body");
          const href = settingText(block.settings, "href");
          const icon = resolveSettingIcon(block.settings, "icon") ?? {
            kind: "lucide" as const,
            name: settingIcon(block.settings, "icon"),
          };
          const inner = (
            <>
              {showIcons && icon ? (
                <span className="card-icon" aria-hidden="true">
                  <SettingIconMark icon={icon} size={20} />
                </span>
              ) : null}
              <span className="title">{title}</span>
              {body ? <span className="muted">{body}</span> : null}
            </>
          );
          return href ? (
            <SiteLink
              key={block.id}
              href={href}
              className={className}
              blockId={block.id}
            >
              {inner}
            </SiteLink>
          ) : (
            <div key={block.id} className={className} data-block-id={block.id}>
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
