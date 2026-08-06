import { type CSSProperties, type ReactElement } from "react";

import {
  groupColumns,
  hasCustomSurface,
  resolvePageHeaderText,
  resolveSectionGaps,
  resolveSectionLayout,
  resolveSurfaceStyle,
  settingBool,
  settingIcon,
  settingLines,
  settingNumber,
  settingText,
  surfaceStyleCss,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import {
  PAGE_MENU_SOURCES,
  resolvePageMenu,
  type PageMenuSource,
  type PublicSitePage,
} from "../../../shared/site-cms.js";
import { THEME_SECTION_SPACING } from "../../../shared/theme-sections.js";
import { MarkdownProse } from "../MarkdownProse.js";

import { SECTION_ICON_COMPONENTS } from "./section-icons.js";
import { SiteLink } from "./SiteLink.js";

export { SiteLink } from "./SiteLink.js";

/* -------------------------------------------------------------------------- */
/* 共用片段                                                                    */
/* -------------------------------------------------------------------------- */

function gridClass(columns: number): string {
  return `grid cols-${columns === 2 || columns === 4 ? columns : 3}`;
}

function blockCardClass(plain = false): string {
  return plain ? "card card-plain" : "card";
}

function blockCardProps(
  settings: SettingValues,
  plain = false,
): { className: string; style: CSSProperties } {
  const surface = resolveSurfaceStyle(settings);
  return {
    className: blockCardClass(plain),
    style: surfaceStyleCss(surface) as CSSProperties,
  };
}

/** 富文本区块：与文档页共用一套 markdown 排版（见 MarkdownProse）。 */
function MarkdownBlock({ body_md }: { body_md: string }): ReactElement | null {
  if (!body_md) return null;
  return (
    <div className="prose">
      <MarkdownProse markdown={body_md} />
    </div>
  );
}

function ButtonRow({
  settings,
  align,
}: {
  settings: SettingValues;
  align?: string;
}): ReactElement | null {
  const buttons = (["primary", "secondary"] as const)
    .map((prefix) => ({
      prefix,
      label: settingText(settings, `${prefix}_label`),
      href: settingText(settings, `${prefix}_href`),
    }))
    .filter((item) => item.label && item.href);

  if (buttons.length === 0) return null;

  return (
    <p className={`btn-row${align === "center" ? " center" : ""}`}>
      {buttons.map((item) => (
        <SiteLink
          key={item.prefix}
          href={item.href}
          className={
            item.prefix === "secondary" ? "btn btn-secondary" : "btn"
          }
        >
          {item.label}
        </SiteLink>
      ))}
    </p>
  );
}

/** 区块抬头：标题 + 描述 + 可选的右上角按钮。 */
function SectionHeading({
  settings,
  action,
}: {
  settings: SettingValues;
  action?: boolean;
}): ReactElement | null {
  const heading = settingText(settings, "heading");
  const subheading = settingText(settings, "subheading");
  const label = settingText(settings, "primary_label");
  const href = settingText(settings, "primary_href");
  const hasAction = Boolean(action && label && href);

  if (!heading && !subheading && !hasAction) return null;

  return (
    <div className="sec-head">
      <div>
        {heading ? <h2>{heading}</h2> : null}
        {subheading ? <p className="lead">{subheading}</p> : null}
      </div>
      {hasAction ? (
        <SiteLink href={href} className="btn btn-secondary">
          {label}
        </SiteLink>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 各 section 渲染                                                             */
/* -------------------------------------------------------------------------- */

function HeroSection({ section }: { section: SiteSection }): ReactElement {
  const s = section.settings;
  const align = settingText(s, "align");
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");
  const centered = align === "center";

  return (
    <div className={`hero${centered ? " center" : ""}`}>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{settingText(s, "headline")}</h1>
      {subhead ? <p className="lead">{subhead}</p> : null}
      <ButtonRow settings={s} align={align} />
      {section.blocks.length > 0 ? (
        <dl className="stats">
          {section.blocks.map((block) => (
            <div key={block.id}>
              <dt>{settingText(block.settings, "term")}</dt>
              <dd>{settingText(block.settings, "detail")}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function FeatureGridSection({
  section,
}: {
  section: SiteSection;
}): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const showIcons = settingBool(s, "show_icons");

  return (
    <div>
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
    </div>
  );
}

function StepsSection({
  section,
}: {
  section: SiteSection;
}): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const showNumber = settingBool(s, "show_number");

  return (
    <div>
      <SectionHeading settings={s} action />
      <ol className={gridClass(settingNumber(s, "columns", 3))}>
        {section.blocks.map((block, index) => {
          const body = settingText(block.settings, "body");
          const code = settingText(block.settings, "code");
          const card = blockCardProps(block.settings);
          return (
            <li
              key={block.id}
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
    </div>
  );
}

function SpecListSection({
  section,
}: {
  section: SiteSection;
}): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const stacked = settingText(s, "layout") === "stacked";
  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const label = settingText(s, "primary_label");
  const href = settingText(s, "primary_href");

  const rows = (
    <dl className="spec">
      {section.blocks.map((block) => (
        <div key={block.id} className="spec-row">
          <dt>{settingText(block.settings, "term")}</dt>
          <dd>{settingText(block.settings, "detail")}</dd>
        </div>
      ))}
    </dl>
  );

  if (stacked) {
    return (
      <div>
        <SectionHeading settings={s} action />
        {rows}
      </div>
    );
  }

  return (
    <div className="split">
      <div>
        {heading ? <h2>{heading}</h2> : null}
        {subheading ? <p className="lead">{subheading}</p> : null}
        {label && href ? (
          <p>
            <SiteLink href={href} className="btn btn-secondary">
              {label}
            </SiteLink>
          </p>
        ) : null}
      </div>
      {rows}
    </div>
  );
}

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
      <li className={card.className} style={card.style}>
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
      <li>
        <SiteLink href={href} className={card.className} style={card.style}>
          {inner}
        </SiteLink>
      </li>
    );
  }

  return (
    <li className={card.className} style={card.style}>
      {inner}
    </li>
  );
}

function CardsSection({
  section,
}: {
  section: SiteSection;
}): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const style = settingText(s, "card_style");

  return (
    <div>
      <SectionHeading settings={s} />
      <ul className={gridClass(settingNumber(s, "columns", 3))}>
        {section.blocks.map((block) => (
          <CardBlock key={block.id} block={block} style={style} />
        ))}
      </ul>
    </div>
  );
}

function PricingSection({
  section,
}: {
  section: SiteSection;
}): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;
  const footnote = settingText(s, "footnote");
  const badge = settingText(s, "featured_badge");

  return (
    <div>
      <SectionHeading settings={s} />
      <ul
        className={`${gridClass(settingNumber(s, "columns", 3))} plans`}
      >
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
    </div>
  );
}

function FaqSection({
  section,
}: {
  section: SiteSection;
}): ReactElement | null {
  const s = section.settings;
  if (section.blocks.length === 0) return null;

  return (
    <div>
      <SectionHeading settings={s} />
      <dl className="spec">
        {section.blocks.map((block) => {
          const answer = settingText(block.settings, "answer");
          const surface = resolveSurfaceStyle(block.settings);
          return (
            <div
              key={block.id}
              className="qa"
              style={surfaceStyleCss(surface) as CSSProperties}
            >
              <dt>{settingText(block.settings, "question")}</dt>
              {answer ? <dd>{answer}</dd> : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function BandSection({ section }: { section: SiteSection }): ReactElement {
  const s = section.settings;
  const body = settingText(s, "body");
  const align = settingText(s, "align");
  const centered = align === "center";

  return (
    <div className={`band${centered ? " center" : ""}`}>
      <h2>{settingText(s, "headline")}</h2>
      {body ? <p className="lead">{body}</p> : null}
      <ButtonRow settings={s} align={align} />
    </div>
  );
}

function GroupSection({
  section,
  pages,
  currentPath,
  sectionSpacing,
  onSelectSection,
}: {
  section: SiteSection;
  pages: PublicSitePage[];
  currentPath: string;
  sectionSpacing: number;
  onSelectSection?: (sectionId: string) => void;
}): ReactElement | null {
  const columns = groupColumns(section);
  if (columns.length === 0) return null;
  const stretch = settingText(section.settings, "align_items") === "stretch";

  return (
    <div
      className={`grp${stretch ? " grp-stretch" : ""}`}
      style={
        {
          "--grp-gap": `${settingNumber(section.settings, "column_gap", 40)}px`,
        } as CSSProperties
      }
    >
      {columns.map((column) => {
        const stackClass =
          column.stackOrder !== "auto"
            ? ` grp-stack-${column.stackOrder}`
            : "";
        const stickyClass = column.sticky ? " grp-sticky" : "";
        return (
          <div
            key={column.block.id}
            className={`grp-col grp-span-${column.span}${stackClass}${stickyClass}`}
          >
            <SiteSections
              sections={column.sections}
              contained
              sectionSpacing={sectionSpacing}
              pages={pages}
              currentPath={currentPath}
              onSelectSection={onSelectSection}
            />
          </div>
        );
      })}
    </div>
  );
}

function PageMenuSection({
  section,
  pages,
  currentPath,
}: {
  section: SiteSection;
  pages: PublicSitePage[];
  currentPath: string;
}): ReactElement | null {
  const s = section.settings;
  const rawSource = settingText(s, "source") || "children";
  const source: PageMenuSource = (
    PAGE_MENU_SOURCES as readonly string[]
  ).includes(rawSource)
    ? (rawSource as PageMenuSource)
    : "children";
  const style = settingText(s, "style") || "cards";
  const menu = resolvePageMenu(pages, currentPath, source);
  if (menu.items.length === 0) return null;

  if (style === "list") {
    return (
      <div>
        <SectionHeading settings={s} />
        <nav
          className="page-menu-list"
          aria-label={menu.title || "Pages"}
        >
          <ul>
            {menu.items.map((page) => (
              <li
                key={page.path}
                aria-current={page.path === currentPath ? "page" : undefined}
              >
                <SiteLink href={page.path}>{page.title}</SiteLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading settings={s} />
      <ul className={gridClass(settingNumber(s, "columns", 2))}>
        {menu.items.map((page) => (
          <li key={page.path}>
            <SiteLink href={page.path} className="card">
              <span className="title">{page.title}</span>
              {page.description ? (
                <span className="muted">{page.description}</span>
              ) : null}
            </SiteLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PageHeaderSection({
  section,
  pages,
  currentPath,
}: {
  section: SiteSection;
  pages?: PublicSitePage[];
  currentPath?: string;
}): ReactElement | null {
  const page = pages?.find((item) => item.path === currentPath);
  const { headline, subhead } = resolvePageHeaderText(section.settings, page);
  if (!headline && !subhead) return null;
  const centered = settingText(section.settings, "align") === "center";

  return (
    <div
      className="page-head"
      style={centered ? { textAlign: "center" } : undefined}
    >
      {headline ? <h1>{headline}</h1> : null}
      {subhead ? <p>{subhead}</p> : null}
    </div>
  );
}

function SectionView({
  section,
  pages,
  currentPath,
  sectionSpacing,
  onSelectSection,
}: {
  section: SiteSection;
  pages: PublicSitePage[];
  currentPath: string;
  sectionSpacing: number;
  onSelectSection?: (sectionId: string) => void;
}): ReactElement | null {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} />;
    case "feature-grid":
      return <FeatureGridSection section={section} />;
    case "steps":
      return <StepsSection section={section} />;
    case "spec-list":
      return <SpecListSection section={section} />;
    case "cards":
      return <CardsSection section={section} />;
    case "page-menu":
      return (
        <PageMenuSection
          section={section}
          pages={pages}
          currentPath={currentPath}
        />
      );
    case "pricing":
      return <PricingSection section={section} />;
    case "faq":
      return <FaqSection section={section} />;
    case "band":
      return <BandSection section={section} />;
    case "group":
      return (
        <GroupSection
          section={section}
          pages={pages}
          currentPath={currentPath}
          sectionSpacing={sectionSpacing}
          onSelectSection={onSelectSection}
        />
      );
    case "page-header":
      return (
        <PageHeaderSection
          section={section}
          pages={pages}
          currentPath={currentPath}
        />
      );
    case "prose":
      return (
        <MarkdownBlock body_md={settingText(section.settings, "body_md")} />
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */

interface SiteSectionsProps {
  sections: SiteSection[];
  onSelectSection?: (sectionId: string) => void;
  sectionSpacing?: number;
  contained?: boolean;
  pages?: PublicSitePage[];
  currentPath?: string;
}

export function SiteSections({
  sections,
  onSelectSection,
  sectionSpacing = THEME_SECTION_SPACING.default,
  contained = false,
  pages = [],
  currentPath = "/",
}: SiteSectionsProps): ReactElement {
  const layouts = sections.map((section) =>
    resolveSectionLayout(section.settings),
  );
  const gaps = resolveSectionGaps(layouts, sectionSpacing);

  return (
    <div>
      {sections.map((section, index) => {
        const layout = layouts[index]!;
        const surface = resolveSurfaceStyle(section.settings);
        const width =
          contained && layout.width === "full" ? "page" : layout.width;
        const glow = settingBool(section.settings, "show_glow");
        const useTokenBg =
          !surface.backgroundColor && layout.background !== "none";
        const useDefaultRadius =
          surface.borderRadius === null &&
          (useTokenBg || hasCustomSurface(surface)) &&
          width !== "full";

        const bandClass = [
          "sec-band",
          `sec-w-${width}`,
          useTokenBg ? `sec-bg-${layout.background}` : "",
          useDefaultRadius ? "sec-radius-default" : "",
          layout.dividerTop ? "sec-divider-top" : "",
          layout.dividerBottom ? "sec-divider-bottom" : "",
          glow ? "has-glow" : "",
          hasCustomSurface(surface) ? "has-surface" : "",
        ]
          .filter(Boolean)
          .join(" ");

        const contentClass = contained
          ? "sec-content sec-c-contained"
          : `sec-content sec-c-${layout.contentWidth}`;

        return (
          <section
            key={section.id}
            id={layout.anchor || undefined}
            data-section-id={section.id}
            className="sec"
            style={
              {
                "--sec-gap": `${gaps[index]}px`,
                ...(onSelectSection ? { cursor: "pointer" } : {}),
              } as CSSProperties
            }
            role={onSelectSection ? "button" : undefined}
            tabIndex={onSelectSection ? 0 : undefined}
            onClick={
              onSelectSection
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectSection(section.id);
                  }
                : undefined
            }
            onKeyDown={
              onSelectSection
                ? (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectSection(section.id);
                    }
                  }
                : undefined
            }
          >
            <div
              className={bandClass}
              style={
                {
                  "--sec-pt": `${layout.paddingTop}px`,
                  "--sec-pb": `${layout.paddingBottom}px`,
                  ...(surfaceStyleCss(surface) as CSSProperties),
                } as CSSProperties
              }
            >
              {glow ? <div className="sec-glow" aria-hidden /> : null}
              <div className={contentClass}>
                <SectionView
                  section={section}
                  pages={pages}
                  currentPath={currentPath}
                  sectionSpacing={sectionSpacing}
                  onSelectSection={onSelectSection}
                />
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
