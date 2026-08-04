import { type CSSProperties, type ReactElement } from "react";

import { Button } from "@be-water/ui/button";
import { cn } from "@be-water/ui/utils";
import { ArrowRight, Check } from "lucide-react";

import {
  gridColumnsClass,
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
  type SectionLayout,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
  type SurfaceStyle,
} from "../../../shared/section-schema.js";
import {
  PAGE_MENU_SOURCES,
  resolvePageMenu,
  type PageMenuSource,
  type PublicSitePage,
} from "../../../shared/site-cms.js";
import {
  HERO_GLOW_BACKGROUND,
  THEME_SECTION_SPACING,
} from "../../../shared/theme-sections.js";
import { MarkdownProse } from "../MarkdownProse.js";
import { PageMenuList } from "../PageMenuList.js";

import { SECTION_ICON_COMPONENTS } from "./section-icons.js";
import { SiteLink } from "./SiteLink.js";

export { SiteLink } from "./SiteLink.js";

/* -------------------------------------------------------------------------- */
/* 共用片段                                                                    */
/* -------------------------------------------------------------------------- */

/** 富文本区块：与文档页共用一套 markdown 排版（见 MarkdownProse）。 */
function MarkdownBlock({ body_md }: { body_md: string }): ReactElement | null {
  if (!body_md) return null;
  return (
    <div>
      <MarkdownProse markdown={body_md} />
    </div>
  );
}

function ButtonRow({
  settings,
  align,
  size = "default",
}: {
  settings: SettingValues;
  align?: string;
  size?: "default" | "lg";
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
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        align === "center" && "justify-center",
      )}
    >
      {buttons.map((item) => (
        <Button
          key={item.prefix}
          asChild
          size={size}
          variant={item.prefix === "primary" ? "default" : "outline"}
          className={size === "lg" ? "h-11 px-5 text-base" : undefined}
        >
          <SiteLink href={item.href}>{item.label}</SiteLink>
        </Button>
      ))}
    </div>
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
  const align = settingText(settings, "align");
  const label = settingText(settings, "primary_label");
  const href = settingText(settings, "primary_href");
  const hasAction = Boolean(action && label && href);

  if (!heading && !subheading && !hasAction) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        align === "center" && "flex-col items-center text-center",
      )}
    >
      <div className="max-w-2xl">
        {heading ? (
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {heading}
          </h2>
        ) : null}
        {subheading ? (
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        ) : null}
      </div>
      {hasAction ? (
        <Button asChild variant="outline" className="h-10 px-4">
          <SiteLink href={href}>
            {label}
            <ArrowRight className="size-4" />
          </SiteLink>
        </Button>
      ) : null}
    </div>
  );
}

const BACKGROUND_CLASS: Record<SectionLayout["background"], string> = {
  none: "",
  muted: "bg-muted/40",
  accent: "bg-primary/8",
  outline: "border border-border/60",
};

/** block / 卡片外壳：自定义外观盖过默认底色 / 边 / 圆角。 */
function blockShellClass(style: SurfaceStyle, plain = false): string {
  if (plain) return "py-2";
  return cn(
    "p-5",
    style.backgroundColor ? null : "bg-background",
    style.borderWidth > 0 ? null : "border border-border/60",
    style.borderRadius !== null ? null : "rounded-xl",
  );
}

function blockShellStyle(
  settings: SettingValues,
  plain = false,
): {
  className: string;
  style: CSSProperties;
} {
  const surface = resolveSurfaceStyle(settings);
  return {
    className: blockShellClass(surface, plain),
    style: plain ? {} : (surfaceStyleCss(surface) as CSSProperties),
  };
}

/**
 * 每个 section 分两层：外层「色块」（背景 / 分隔线 / 上下留白）与内层「正文」。
 *
 * 限宽落在这两层上、而不是页面外壳上，`full` 才可能把色块放开到通栏；
 * 两层各自限宽，所以「通栏色带 + 居中正文」和「通栏大图」都表达得出来。
 * 页宽本身是主题设置，走 `--site-page-width`。切换背景只换底色，不会把
 * 正文横向挪位（对齐 Shopify 的 color scheme）。
 */
const PAGE_WIDTH = "max-w-[var(--site-page-width,72rem)]";

const BAND_CLASS: Record<SectionLayout["width"], string> = {
  page: `mx-auto w-full ${PAGE_WIDTH}`,
  full: "w-full",
};

const CONTENT_CLASS: Record<SectionLayout["contentWidth"], string> = {
  default: `mx-auto w-full ${PAGE_WIDTH} px-4 sm:px-6`,
  narrow: "mx-auto w-full max-w-3xl px-4 sm:px-6",
  full: "w-full px-4 sm:px-6",
};

/** 容器段的列里外层已经限宽并给了 gutter，正文只管填满那一列。 */
const CONTAINED_CONTENT_CLASS = "w-full";

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
    // 光晕不在这里：它是**容器**级的背景效果，画在色块层上（见 SiteSections），
    // 否则只盖住正文盒子，顶不到 section 的上留白
    <div className={cn(centered && "text-center")}>
      {eyebrow ? (
        <p className="text-sm font-medium tracking-wide text-primary">
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]",
          centered && "mx-auto",
        )}
      >
        {settingText(s, "headline")}
      </h1>
      {subhead ? (
        <p
          className={cn(
            "mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground",
            centered && "mx-auto",
          )}
        >
          {subhead}
        </p>
      ) : null}

      <div className="mt-8">
        <ButtonRow settings={s} align={align} size="lg" />
      </div>

      {section.blocks.length > 0 ? (
        <dl
          className={cn(
            "mt-14 grid max-w-2xl gap-6 sm:grid-cols-3",
            centered && "mx-auto",
          )}
        >
          {section.blocks.map((block) => (
            <div key={block.id}>
              <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                {settingText(block.settings, "term")}
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {settingText(block.settings, "detail")}
              </dd>
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
    <div className="space-y-8">
      <SectionHeading settings={s} />
      <ul
        className={cn(
          "grid gap-3",
          gridColumnsClass(settingNumber(s, "columns", 3)),
        )}
      >
        {section.blocks.map((block) => {
          const Icon =
            SECTION_ICON_COMPONENTS[settingIcon(block.settings, "icon")];
          const body = settingText(block.settings, "body");
          const shell = blockShellStyle(block.settings);
          return (
            <li key={block.id} className={shell.className} style={shell.style}>
              {showIcons ? (
                <span className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden />
                </span>
              ) : null}
              <p className="font-medium">
                {settingText(block.settings, "title")}
              </p>
              {body ? (
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              ) : null}
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
    <div className="space-y-8">
      <SectionHeading settings={s} action />
      <ol
        className={cn(
          "grid gap-3",
          gridColumnsClass(settingNumber(s, "columns", 3)),
        )}
      >
        {section.blocks.map((block, index) => {
          const body = settingText(block.settings, "body");
          const code = settingText(block.settings, "code");
          const shell = blockShellStyle(block.settings);
          return (
            <li key={block.id} className={shell.className} style={shell.style}>
              {showNumber ? (
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  {String(index + 1).padStart(2, "0")}
                </span>
              ) : null}
              <p className="mt-2 font-medium">
                {settingText(block.settings, "title")}
              </p>
              {body ? (
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              ) : null}
              {code ? (
                <code className="mt-3 block text-xs text-primary">{code}</code>
              ) : null}
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
    <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
      {section.blocks.map((block) => (
        <div
          key={block.id}
          className="grid grid-cols-[5rem_1fr] gap-4 bg-background px-5 py-4 text-sm"
        >
          <dt className="text-muted-foreground">
            {settingText(block.settings, "term")}
          </dt>
          <dd className="font-medium">
            {settingText(block.settings, "detail")}
          </dd>
        </div>
      ))}
    </dl>
  );

  if (stacked) {
    return (
      <div className="space-y-8">
        <SectionHeading settings={s} action />
        {rows}
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
      <div>
        {heading ? (
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {heading}
          </h2>
        ) : null}
        {subheading ? (
          <p className="mt-3 text-muted-foreground">{subheading}</p>
        ) : null}
        {label && href ? (
          <Button asChild variant="outline" className="mt-6 h-10 px-4">
            <SiteLink href={href}>
              {label}
              <ArrowRight className="size-4" />
            </SiteLink>
          </Button>
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
  const shell = blockShellStyle(block.settings, plain);

  if (block.type === "stat") {
    const label = settingText(block.settings, "label");
    return (
      <li className={shell.className} style={shell.style}>
        <strong className="text-3xl leading-tight font-semibold text-primary">
          {settingText(block.settings, "value")}
        </strong>
        {label ? (
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
        ) : null}
      </li>
    );
  }

  const body = settingText(block.settings, "body");
  const href = settingText(block.settings, "href");
  const inner = (
    <>
      <span className="flex items-center gap-1.5 font-medium">
        {settingText(block.settings, "title")}
        {href ? (
          <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
        ) : null}
      </span>
      {body ? (
        <span className="mt-1.5 block text-sm text-muted-foreground">
          {body}
        </span>
      ) : null}
    </>
  );

  return (
    <li>
      {href ? (
        <SiteLink
          href={href}
          className={cn(
            "group block h-full",
            shell.className,
            !plain && "transition-colors hover:border-primary/40 hover:bg-muted/40",
          )}
          style={shell.style}
        >
          {inner}
        </SiteLink>
      ) : (
        <div className={shell.className} style={shell.style}>
          {inner}
        </div>
      )}
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
    <div className="space-y-8">
      <SectionHeading settings={s} />
      <ul
        className={cn(
          "grid gap-3",
          gridColumnsClass(settingNumber(s, "columns", 3)),
        )}
      >
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
    <div className="space-y-8">
      <SectionHeading settings={s} />
      <ul
        className={cn(
          "grid items-stretch gap-4",
          gridColumnsClass(settingNumber(s, "columns", 3)),
        )}
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
              className={cn(
                "relative flex flex-col p-6",
                surface.backgroundColor ? null : "bg-background",
                surface.borderWidth > 0
                  ? null
                  : featured
                    ? "border border-primary/50 shadow-sm ring-1 ring-primary/20"
                    : "border border-border/60",
                surface.borderRadius !== null ? null : "rounded-2xl",
              )}
              style={surfaceStyleCss(surface) as CSSProperties}
            >
              {featured && badge ? (
                <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {badge}
                </span>
              ) : null}

              <h3 className="font-medium">{settingText(b, "name")}</h3>
              {audience ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {audience}
                </p>
              ) : null}

              <p className="mt-5 text-3xl font-semibold tracking-tight">
                {settingText(b, "price")}
              </p>
              {priceNote ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {priceNote}
                </p>
              ) : null}

              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {settingLines(b, "highlights").map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>

              {label && href ? (
                <Button
                  asChild
                  variant={featured ? "default" : "outline"}
                  className="mt-7 h-10 w-full"
                >
                  <SiteLink href={href}>{label}</SiteLink>
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {footnote ? (
        <p className="text-sm text-muted-foreground">{footnote}</p>
      ) : null}
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
    <div className="space-y-8">
      <SectionHeading settings={s} />
      <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
        {section.blocks.map((block) => {
          const answer = settingText(block.settings, "answer");
          const surface = resolveSurfaceStyle(block.settings);
          return (
            <div
              key={block.id}
              className={cn(
                "px-6 py-5",
                surface.backgroundColor ? null : "bg-background",
              )}
              style={surfaceStyleCss(surface) as CSSProperties}
            >
              <dt className="font-medium">
                {settingText(block.settings, "question")}
              </dt>
              {answer ? (
                <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {answer}
                </dd>
              ) : null}
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

  // 底色 / 描边由外层通用 background 承担，这里只管内容
  return (
    <div className={cn(align === "center" && "text-center")}>
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {settingText(s, "headline")}
      </h2>
      {body ? (
        <p
          className={cn(
            "mt-3 max-w-xl text-muted-foreground",
            align === "center" && "mx-auto",
          )}
        >
          {body}
        </p>
      ) : null}
      <div className="mt-7">
        <ButtonRow settings={s} align={align} size="lg" />
      </div>
    </div>
  );
}

/** 12 栏制列宽（静态类名，Tailwind 要能扫到）。 */
const GROUP_SPAN_CLASS: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

/** 窄屏堆叠顺序：桌面永远按声明顺序，只有堆起来之后才谈得上「谁在前」。 */
const STACK_ORDER_CLASS: Record<"auto" | "first" | "last", string> = {
  auto: "",
  first: "max-md:order-first",
  last: "max-md:order-last",
};

/**
 * 容器段：页面里唯一的分栏原语。列是 block，列内递归渲染子段。
 *
 * 列内复用 `SiteSections` 自身并打开 `contained`——列已经限过宽、给过留白，
 * 子段不该再自带 gutter，`width: full` 在一列里也没有「通栏」可言。
 */
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
      className={cn(
        // 窄屏一列到底，桌面才进 12 栏
        "grid grid-cols-1 md:grid-cols-12",
        "gap-[calc(var(--grp-gap)*0.7)] md:gap-[var(--grp-gap)]",
        stretch ? "md:items-stretch" : "md:items-start",
      )}
      style={
        {
          "--grp-gap": `${settingNumber(section.settings, "column_gap", 40)}px`,
        } as CSSProperties
      }
    >
      {columns.map((column) => (
        <div
          key={column.block.id}
          className={cn(
            GROUP_SPAN_CLASS[column.span],
            STACK_ORDER_CLASS[column.stackOrder],
            // sticky 必须配 `self-start`：拉伸满高的列没有可滚动的余量，粘不住
            column.sticky && "md:sticky md:top-20 md:self-start",
          )}
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
      ))}
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
      <div className="space-y-8">
        <SectionHeading settings={s} />
        <PageMenuList
          title={menu.title}
          titlePath={menu.title_path}
          items={menu.items.map((page) => ({
            label: page.title,
            href: page.path,
          }))}
          currentPath={currentPath}
          showTitle={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading settings={s} />
      <ul
        className={cn(
          "grid gap-3",
          gridColumnsClass(settingNumber(s, "columns", 2)),
        )}
      >
        {menu.items.map((page) => (
          <li key={page.path}>
            <SiteLink
              href={page.path}
              className="group block h-full rounded-xl border border-border/60 bg-background p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex items-center gap-1.5 font-medium">
                {page.title}
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
              </span>
              {page.description ? (
                <span className="mt-1.5 block text-sm text-muted-foreground">
                  {page.description}
                </span>
              ) : null}
            </SiteLink>
          </li>
        ))}
      </ul>
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
  /** 容器段要把它继续传给列内的子段流。 */
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
    // header / footer 由 TenantSiteView 单独渲染，不进页面 section 流
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */

/**
 * 页面标题段：h1 + 一句描述。
 *
 * 文案留空回落到页面自己的 title / description —— 这一段以前是自动渲染的，
 * 现在是树上一段普通 section，但「不填也有标题」这个便利保留下来。
 */
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
    <div className={cn("space-y-3", centered && "text-center")}>
      {headline ? (
        <h1 className="text-3xl font-semibold tracking-tight">{headline}</h1>
      ) : null}
      {subhead ? <p className="text-muted-foreground">{subhead}</p> : null}
    </div>
  );
}

interface SiteSectionsProps {
  sections: SiteSection[];
  onSelectSection?: (sectionId: string) => void;
  /** 主题的「区块间距」，段设成「继承」时用这个值。 */
  sectionSpacing?: number;
  /**
   * 外层已经限宽并给了左右留白（文档页的侧栏布局）：section 不再自带 gutter，
   * `full` 也退化成 `page`——侧栏旁边没有「通栏」可言。
   */
  contained?: boolean;
  /** `page-menu` 动态条目来源；未传时该 section 不渲染。 */
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
  const resolved = sections;
  const layouts = resolved.map((section) =>
    resolveSectionLayout(section.settings),
  );
  const gaps = resolveSectionGaps(layouts, sectionSpacing);

  // 选中后的滚动由预览容器的拥有者统一处理（页头 / 页脚也要能滚到）
  return (
    <div>
      {resolved.map((section, index) => {
        const layout = layouts[index]!;
        const surface = resolveSurfaceStyle(section.settings);
        const width =
          contained && layout.width === "full" ? "page" : layout.width;
        // 光晕是容器级的背景效果，和 background/divider 同层（目前只有 hero 声明它）
        const glow = settingBool(section.settings, "show_glow");
        // 自定义底色盖过 token preset；自定义圆角盖过默认 rounded-xl
        const useTokenBg =
          !surface.backgroundColor && layout.background !== "none";
        const useDefaultRadius =
          surface.borderRadius === null &&
          (useTokenBg || hasCustomSurface(surface)) &&
          width !== "full";
        return (
          <section
            key={section.id}
            id={layout.anchor || undefined}
            data-section-id={section.id}
            style={
              {
                "--sec-pt": `${layout.paddingTop}px`,
                "--sec-pb": `${layout.paddingBottom}px`,
                "--sec-gap": `${gaps[index]}px`,
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
            className={cn(
              "scroll-mt-16",
              // 段间距：显式落在后一段上方，首段为 0（不与页头打架）
              "mt-[calc(var(--sec-gap)*0.7)] sm:mt-[var(--sec-gap)]",
              onSelectSection && "cursor-pointer",
            )}
          >
            <div
              className={cn(
                BAND_CLASS[width],
                // 存的是桌面值，窄屏按比例缩——手机上不会顶着 120px 的留白
                "pt-[calc(var(--sec-pt)*0.7)] pb-[calc(var(--sec-pb)*0.7)]",
                "sm:pt-[var(--sec-pt)] sm:pb-[var(--sec-pb)]",
                // 通栏色块贴着视口边，圆角会露出两个缺口
                useDefaultRadius && "rounded-xl",
                useTokenBg && BACKGROUND_CLASS[layout.background],
                layout.dividerTop && "border-t border-border/60",
                layout.dividerBottom && "border-b border-border/60",
                // `isolate` 不能少：光晕是 `-z-10`，没有自己的层叠上下文会掉到祖先背景之后
                glow && "relative isolate",
              )}
              style={surfaceStyleCss(surface) as CSSProperties}
            >
              {glow ? (
                <div
                  aria-hidden
                  // 跟着色块走：顶到 section 容器上沿（含上留白），圆角也随色块
                  className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
                  style={{ background: HERO_GLOW_BACKGROUND }}
                />
              ) : null}
              <div
                className={
                  contained
                    ? CONTAINED_CONTENT_CLASS
                    : CONTENT_CLASS[layout.contentWidth]
                }
              >
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
