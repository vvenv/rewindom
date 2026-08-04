/**
 * SSR 侧的 section 渲染：与 `client/components/sections/` 一一对应。
 *
 * 两处渲染吃同一份 schema（`shared/section-registry.ts`），新增字段要同时改这里；
 * SEO 正文以本文件为准，客户端只是水合后的可读 UI。
 */

import { marked } from "marked";

import {
  groupColumns,
  hasCustomSurface,
  resolveSectionGaps,
  resolveSectionLayout,
  resolveSurfaceStyle,
  settingBool,
  settingLines,
  settingNumber,
  resolvePageHeaderText,
  settingText,
  surfaceStyleAttr,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../shared/section-schema.js";
import {
  PAGE_MENU_SOURCES,
  resolvePageMenu,
  siteNavPages,
  type PageMenuSource,
  type PublicSitePage,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";

import { escapeHtml } from "./site.util.js";

import type { AppLocale } from "@be-water/shared";

/** block / 卡片上的自定义外观：有设置才吐 ` style="..."`。 */
function blockSurfaceAttr(settings: SettingValues): string {
  const attr = surfaceStyleAttr(resolveSurfaceStyle(settings));
  return attr ? ` style="${attr}"` : "";
}

/** `page-menu` 等需要站点目录的 section 渲染上下文。 */
export interface SectionRenderContext {
  pages?: PublicSitePage[];
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
  /** 主题的「区块间距」；容器段要拿它算列内子段之间的缝。 */
  sectionSpacing?: number;
}

marked.setOptions({ gfm: true, breaks: false });

function md(body: string): string {
  const html = marked.parse(body || "", { async: false }) as string;
  // 表格套一层滚动容器：和 SPA 的 MarkdownProse 结构一致。
  // 直接给 table 上 `display:block;overflow:auto` 会让单元格缩成内容宽度，撑不满。
  return html
    .replaceAll("<table>", '<div class="table-wrap"><table>')
    .replaceAll("</table>", "</table></div>");
}

function isExternal(href: string): boolean {
  return /^(https?:|mailto:|tel:)/u.test(href);
}

function linkAttrs(href: string): string {
  return isExternal(href)
    ? ` href="${escapeHtml(href)}" rel="noreferrer noopener" target="_blank"`
    : ` href="${escapeHtml(href)}"`;
}

function buttonRow(settings: SettingValues, align: string): string {
  const buttons = (["primary", "secondary"] as const)
    .map((prefix) => ({
      prefix,
      label: settingText(settings, `${prefix}_label`),
      href: settingText(settings, `${prefix}_href`),
    }))
    .filter((item) => item.label && item.href)
    .map(
      (item) =>
        `<a class="btn${item.prefix === "secondary" ? " btn-secondary" : ""}"${linkAttrs(item.href)}>${escapeHtml(item.label)}</a>`,
    );
  if (buttons.length === 0) return "";
  return `<p class="btn-row${align === "center" ? " center" : ""}">${buttons.join("")}</p>`;
}

function sectionHeading(settings: SettingValues, action = false): string {
  const heading = settingText(settings, "heading");
  const subheading = settingText(settings, "subheading");
  const label = settingText(settings, "primary_label");
  const href = settingText(settings, "primary_href");
  const hasAction = action && label && href;
  if (!heading && !subheading && !hasAction) return "";

  return `<div class="sec-head">
  <div>
    ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}
    ${subheading ? `<p class="lead">${escapeHtml(subheading)}</p>` : ""}
  </div>
  ${hasAction ? `<a class="btn btn-secondary"${linkAttrs(href)}>${escapeHtml(label)}</a>` : ""}
</div>`;
}

function gridClass(columns: number): string {
  return `grid cols-${columns === 2 || columns === 4 ? columns : 3}`;
}

/* -------------------------------------------------------------------------- */

function renderHero(section: SiteSection): string {
  const s = section.settings;
  const align = settingText(s, "align");
  const eyebrow = settingText(s, "eyebrow");
  const subhead = settingText(s, "subhead");
  const stats = section.blocks
    .map(
      (block) =>
        `<div><dt>${escapeHtml(settingText(block.settings, "term"))}</dt><dd>${escapeHtml(settingText(block.settings, "detail"))}</dd></div>`,
    )
    .join("");

  return `<div class="hero${align === "center" ? " center" : ""}">
  ${eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
  <h1>${escapeHtml(settingText(s, "headline"))}</h1>
  ${subhead ? `<p class="lead">${escapeHtml(subhead)}</p>` : ""}
  ${buttonRow(s, align)}
  ${stats ? `<dl class="stats">${stats}</dl>` : ""}
</div>`;
}

function renderFeatureGrid(section: SiteSection): string {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const items = section.blocks
    .map((block) => {
      const body = settingText(block.settings, "body");
      return `<li class="card"${blockSurfaceAttr(block.settings)}>
  <p class="title">${escapeHtml(settingText(block.settings, "title"))}</p>
  ${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}
</li>`;
    })
    .join("");
  return `<div>
  ${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ul>
</div>`;
}

function renderSteps(section: SiteSection): string {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const showNumber = settingBool(s, "show_number");
  const items = section.blocks
    .map((block, index) => {
      const body = settingText(block.settings, "body");
      const code = settingText(block.settings, "code");
      return `<li class="card"${blockSurfaceAttr(block.settings)}>
  ${showNumber ? `<span class="eyebrow">${String(index + 1).padStart(2, "0")}</span>` : ""}
  <p class="title">${escapeHtml(settingText(block.settings, "title"))}</p>
  ${body ? `<p class="muted">${escapeHtml(body)}</p>` : ""}
  ${code ? `<code>${escapeHtml(code)}</code>` : ""}
</li>`;
    })
    .join("");
  return `<div>
  ${sectionHeading(s, true)}
  <ol class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ol>
</div>`;
}

function renderSpecList(section: SiteSection): string {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const rows = section.blocks
    .map(
      (block) =>
        `<div class="spec-row"><dt>${escapeHtml(settingText(block.settings, "term"))}</dt><dd>${escapeHtml(settingText(block.settings, "detail"))}</dd></div>`,
    )
    .join("");
  const table = `<dl class="spec">${rows}</dl>`;

  if (settingText(s, "layout") === "stacked") {
    return `<div>${sectionHeading(s, true)}${table}</div>`;
  }

  const heading = settingText(s, "heading");
  const subheading = settingText(s, "subheading");
  const label = settingText(s, "primary_label");
  const href = settingText(s, "primary_href");
  return `<div class="split">
  <div>
    ${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}
    ${subheading ? `<p class="lead">${escapeHtml(subheading)}</p>` : ""}
    ${label && href ? `<p><a class="btn btn-secondary"${linkAttrs(href)}>${escapeHtml(label)}</a></p>` : ""}
  </div>
  ${table}
</div>`;
}

function renderCardBlock(block: SiteBlock, plain: boolean): string {
  const cls = plain ? "card card-plain" : "card";
  const surface = blockSurfaceAttr(block.settings);
  if (block.type === "stat") {
    const label = settingText(block.settings, "label");
    return `<li class="${cls}"${surface}><strong class="stat-value">${escapeHtml(settingText(block.settings, "value"))}</strong>${
      label ? `<p class="muted">${escapeHtml(label)}</p>` : ""
    }</li>`;
  }
  const body = settingText(block.settings, "body");
  const href = settingText(block.settings, "href");
  const inner = `<span class="title">${escapeHtml(settingText(block.settings, "title"))}</span>${
    body ? `<span class="muted">${escapeHtml(body)}</span>` : ""
  }`;
  if (href) {
    return `<li><a class="${cls}"${linkAttrs(href)}${surface}>${inner}</a></li>`;
  }
  return `<li class="${cls}"${surface}>${inner}</li>`;
}

function renderCards(section: SiteSection): string {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const plain = settingText(s, "card_style") === "plain";
  const items = section.blocks
    .map((block) => renderCardBlock(block, plain))
    .join("");
  return `<div>
  ${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))}">${items}</ul>
</div>`;
}

function menuHref(path: string, ctx: SectionRenderContext): string {
  if (ctx.locale && ctx.defaultLocale) {
    return withSiteLocale(path, ctx.locale, ctx.defaultLocale);
  }
  return path;
}

function renderPageMenu(
  section: SiteSection,
  ctx: SectionRenderContext,
): string {
  const pages = ctx.pages ?? [];
  const currentPath = ctx.currentPath ?? "/";
  const s = section.settings;
  const rawSource = settingText(s, "source") || "children";
  const source: PageMenuSource = (
    PAGE_MENU_SOURCES as readonly string[]
  ).includes(rawSource)
    ? (rawSource as PageMenuSource)
    : "children";
  const style = settingText(s, "style") || "cards";
  const menu = resolvePageMenu(pages, currentPath, source);
  if (menu.items.length === 0) return "";

  const href = (path: string): string => escapeHtml(menuHref(path, ctx));

  if (style === "list") {
    const links = menu.items
      .map(
        (page) =>
          `<li${page.path === currentPath ? ' aria-current="page"' : ""}><a href="${href(page.path)}">${escapeHtml(page.title)}</a></li>`,
      )
      .join("");
    return `<div>
  ${sectionHeading(s)}
  <nav class="page-menu-list" aria-label="${escapeHtml(menu.title || "Pages")}">
    <ul>${links}</ul>
  </nav>
</div>`;
  }

  const cards = menu.items
    .map((page) => {
      const body = page.description
        ? `<span class="muted">${escapeHtml(page.description)}</span>`
        : "";
      return `<li><a class="card" href="${href(page.path)}"><span class="title">${escapeHtml(page.title)}</span>${body}</a></li>`;
    })
    .join("");
  return `<div>
  ${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 2))}">${cards}</ul>
</div>`;
}

function renderPricing(section: SiteSection): string {
  if (section.blocks.length === 0) return "";
  const s = section.settings;
  const badge = settingText(s, "featured_badge");
  const footnote = settingText(s, "footnote");
  const plans = section.blocks
    .map((block) => {
      const b = block.settings;
      const featured = settingBool(b, "featured");
      const audience = settingText(b, "audience");
      const priceNote = settingText(b, "price_note");
      const label = settingText(b, "primary_label");
      const href = settingText(b, "primary_href");
      const highlights = settingLines(b, "highlights")
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("");
      return `<li class="plan${featured ? " featured" : ""}"${blockSurfaceAttr(b)}>
  ${featured && badge ? `<span class="badge">${escapeHtml(badge)}</span>` : ""}
  <h3>${escapeHtml(settingText(b, "name"))}</h3>
  ${audience ? `<p class="muted">${escapeHtml(audience)}</p>` : ""}
  <p class="price">${escapeHtml(settingText(b, "price"))}</p>
  ${priceNote ? `<p class="muted">${escapeHtml(priceNote)}</p>` : ""}
  ${highlights ? `<ul class="checks">${highlights}</ul>` : ""}
  ${label && href ? `<a class="btn${featured ? "" : " btn-secondary"} btn-block"${linkAttrs(href)}>${escapeHtml(label)}</a>` : ""}
</li>`;
    })
    .join("");
  return `<div>
  ${sectionHeading(s)}
  <ul class="${gridClass(settingNumber(s, "columns", 3))} plans">${plans}</ul>
  ${footnote ? `<p class="muted">${escapeHtml(footnote)}</p>` : ""}
</div>`;
}

function renderFaq(section: SiteSection): string {
  if (section.blocks.length === 0) return "";
  const items = section.blocks
    .map((block) => {
      const answer = settingText(block.settings, "answer");
      return `<div class="qa"${blockSurfaceAttr(block.settings)}>
  <dt>${escapeHtml(settingText(block.settings, "question"))}</dt>
  ${answer ? `<dd>${escapeHtml(answer)}</dd>` : ""}
</div>`;
    })
    .join("");
  return `<div>
  ${sectionHeading(section.settings)}
  <dl class="spec">${items}</dl>
</div>`;
}

function renderBand(section: SiteSection): string {
  const s = section.settings;
  const body = settingText(s, "body");
  const align = settingText(s, "align");
  // 底色 / 描边由外层通用 background 承担，这里只管内容
  return `<div class="band${align === "center" ? " center" : ""}">
  <h2>${escapeHtml(settingText(s, "headline"))}</h2>
  ${body ? `<p class="lead">${escapeHtml(body)}</p>` : ""}
  ${buttonRow(s, align)}
</div>`;
}

/**
 * 容器段：与 SPA 的 `GroupSection` 同构——12 栏 grid，列内递归渲染子段。
 *
 * 列内的子段走 `contained`：列已经限过宽、给过 gutter，子段不再自带这两样，
 * `width: full` 在一列里也没有「通栏」可言。
 */
function renderGroup(section: SiteSection, ctx: SectionRenderContext): string {
  const columns = groupColumns(section);
  if (columns.length === 0) return "";
  const stretch = settingText(section.settings, "align_items") === "stretch";
  const gap = settingNumber(section.settings, "column_gap", 40);

  const cols = columns
    .map((column) => {
      const gaps = resolveSectionGaps(
        column.sections.map((child) => resolveSectionLayout(child.settings)),
        ctx.sectionSpacing ?? 0,
      );
      const inner = column.sections
        .map((child, index) =>
          renderSectionHtml(child, gaps[index], ctx, { contained: true }),
        )
        .join("");
      const classes = [
        "grp-col",
        `grp-span-${column.span}`,
        column.stackOrder !== "auto" ? `grp-stack-${column.stackOrder}` : "",
        column.sticky ? "grp-sticky" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<div class="${classes}">${inner}</div>`;
    })
    .join("");

  return `<div class="grp${stretch ? " grp-stretch" : ""}" style="--grp-gap:${gap}px">${cols}</div>`;
}

/** 版式（留白 / 底色 / 分隔线 / 窄栏）统一由外层 `<section>` 承担。 */
/**
 * 页面标题段：与客户端 `PageHeaderSection` 同一份回落逻辑
 * （`resolvePageHeaderText`），否则 SSR 出的 h1 会和 hydrate 后的对不上。
 */
function renderPageHeader(
  section: SiteSection,
  ctx: SectionRenderContext,
): string {
  const page = ctx.pages?.find(
    (item) => item.path === (ctx.currentPath ?? "/"),
  );
  const { headline, subhead } = resolvePageHeaderText(section.settings, page);
  if (!headline && !subhead) return "";
  const align =
    settingText(section.settings, "align") === "center"
      ? ' style="text-align:center"'
      : "";
  return `<div class="page-head"${align}>${
    headline ? `<h1>${escapeHtml(headline)}</h1>` : ""
  }${subhead ? `<p>${escapeHtml(subhead)}</p>` : ""}</div>`;
}

function renderSectionInner(
  section: SiteSection,
  ctx: SectionRenderContext,
): string {
  switch (section.type) {
    case "hero":
      return renderHero(section);
    case "feature-grid":
      return renderFeatureGrid(section);
    case "steps":
      return renderSteps(section);
    case "spec-list":
      return renderSpecList(section);
    case "cards":
      return renderCards(section);
    case "page-menu":
      return renderPageMenu(section, ctx);
    case "pricing":
      return renderPricing(section);
    case "faq":
      return renderFaq(section);
    case "band":
      return renderBand(section);
    case "group":
      return renderGroup(section, ctx);
    case "page-header":
      return renderPageHeader(section, ctx);
    case "prose":
      return `<div class="prose">${md(settingText(section.settings, "body_md"))}</div>`;
    default:
      // header / footer 单独渲染，不进页面 section 流
      return "";
  }
}

/**
 * 与 client/components/sections/SiteSections.tsx 同构：外层「色块」承背景与上下留白，
 * 内层「正文」负责限宽——限宽落在 section 内部，`full` 才可能通栏。
 *
 * `gap` 是这一段**上方**的段间距，由 `resolveSectionGaps` 统一算好传进来。
 */
export function renderSectionHtml(
  section: SiteSection,
  gap = 0,
  ctx: SectionRenderContext = {},
  options: { contained?: boolean } = {},
): string {
  const inner = renderSectionInner(section, ctx);
  if (!inner) return "";
  const layout = resolveSectionLayout(section.settings);
  const surface = resolveSurfaceStyle(section.settings);
  // 容器段的列里没有「通栏」可言：外层已限宽，full 退化成 page
  const width =
    options.contained && layout.width === "full" ? "page" : layout.width;
  // 光晕是容器级的背景效果，和 background/divider 同层（目前只有 hero 声明它）
  const glow = settingBool(section.settings, "show_glow");
  const useTokenBg =
    !surface.backgroundColor && layout.background !== "none";
  const useDefaultRadius =
    surface.borderRadius === null &&
    (useTokenBg || hasCustomSurface(surface)) &&
    width !== "full";
  const classes = [
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
  // 存的是桌面值，窄屏由 `.sec` / `.sec-band` 的媒体查询按比例缩
  const surfaceAttr = surfaceStyleAttr(surface);
  const style = [
    `--sec-pt:${layout.paddingTop}px`,
    `--sec-pb:${layout.paddingBottom}px`,
    surfaceAttr,
  ]
    .filter(Boolean)
    .join(";");
  const id = layout.anchor ? ` id="${escapeHtml(layout.anchor)}"` : "";
  const glowHtml = glow
    ? `<div class="sec-glow" aria-hidden="true"></div>`
    : "";
  const contentClass = options.contained
    ? "sec-content sec-c-contained"
    : `sec-content sec-c-${layout.contentWidth}`;
  return `<section${id} class="sec" style="--sec-gap:${gap}px"><div class="${classes}" style="${style}">${glowHtml}<div class="${contentClass}">${inner}</div></div></section>`;
}

/* -------------------------------------------------------------------------- */
/* 页头 / 页脚                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * 语言切换器：icon + `<details>` dropdown，菜单内是普通 `<a>`。
 *
 * 刻意做成链接而不是按 `Accept-Language` 自动跳转——自动跳转会让爬虫只看到一种语言，
 * 各语言页面互相收录不到（Shopify 同样只做显式切换 + 推荐横幅）。
 * UI 与 client SiteChrome LocaleSwitcher / LocaleToggle 对齐。
 */
const LOCALE_SWITCHER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;

function renderLocaleSwitcherHtml(options: LocaleSwitcherOption[]): string {
  if (options.length < 2) return "";
  const items = options
    .map(
      (option) =>
        `<a href="${escapeHtml(option.path)}" hreflang="${escapeHtml(option.locale)}"${
          option.current ? ' aria-current="true"' : ""
        }>${escapeHtml(option.label)}</a>`,
    )
    .join("");
  return `<details class="locale-switcher">
  <summary aria-label="Language">${LOCALE_SWITCHER_ICON}</summary>
  <nav class="locale-switcher-menu" aria-label="Language">${items}</nav>
</details>`;
}

export interface LocaleSwitcherOption {
  locale: string;
  /** 已带 locale 前缀的目标路径。 */
  path: string;
  label: string;
  current: boolean;
}

export function renderHeaderHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  /** 品牌区指向的首页（当前语言）。 */
  homeHref: string;
  locales: LocaleSwitcherOption[];
  /** 站点级开关（`theme_settings.show_locale_switcher`）。 */
  showLocaleSwitcher: boolean;
  /** 全站导航（一级页）数据源。 */
  pages?: PublicSitePage[];
  /** 当前逻辑路径（不带 locale 前缀），用于 `aria-current`。 */
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
}): string {
  const { section, siteName, logoUrl, homeHref, locales } = input;
  const s = section.settings;
  const pages = input.pages ?? [];
  const currentPath = input.currentPath ?? "";
  const navItems: Array<{ href: string; label: string; current: boolean }> = [];
  if (settingBool(s, "show_site_nav")) {
    for (const page of siteNavPages(pages)) {
      const href =
        input.locale && input.defaultLocale
          ? withSiteLocale(page.path, input.locale, input.defaultLocale)
          : page.path;
      navItems.push({
        href,
        label: page.title,
        current: page.path === currentPath,
      });
    }
  }
  for (const block of section.blocks) {
    navItems.push({
      href: settingText(block.settings, "href"),
      label: settingText(block.settings, "label"),
      // 自定义链接的 href 可能已带 locale 前缀，不好和逻辑路径对齐；只给一级页标 current。
      current: false,
    });
  }
  const links = navItems
    .map(
      (item) =>
        `<a${linkAttrs(item.href)}${item.current ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`,
    )
    .join("");
  const secondaryLabel = settingText(s, "secondary_label");
  const secondaryHref = settingText(s, "secondary_href");
  const ctaLabel = settingText(s, "primary_label");
  const ctaHref = settingText(s, "primary_href");
  const layout = settingText(s, "layout") || "split";
  const switcher = input.showLocaleSwitcher
    ? renderLocaleSwitcherHtml(locales)
    : "";
  const surface = blockSurfaceAttr(s);

  return `<header class="site-header${settingBool(s, "sticky") ? " sticky" : ""}"${surface}>
  <div class="wrap header-row${layout === "centered" ? " header-layout-centered" : ""}">
    <a class="brand" href="${escapeHtml(homeHref)}">
      ${settingBool(s, "show_logo") && logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" />` : ""}
      ${settingBool(s, "show_site_name") ? `<span>${escapeHtml(siteName)}</span>` : ""}
    </a>
    <nav class="header-nav">${links}</nav>
    <div class="header-actions">
      ${switcher}
      ${secondaryLabel && secondaryHref ? `<a class="btn btn-ghost"${linkAttrs(secondaryHref)}>${escapeHtml(secondaryLabel)}</a>` : ""}
      ${ctaLabel && ctaHref ? `<a class="btn"${linkAttrs(ctaHref)}>${escapeHtml(ctaLabel)}</a>` : ""}
    </div>
  </div>
</header>`;
}

export function renderFooterHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
}): string {
  const { section, siteName, logoUrl } = input;
  const s = section.settings;
  const blurb = settingText(s, "blurb");
  const copyright =
    settingText(s, "copyright") || `© ${new Date().getFullYear()} ${siteName}`;

  const groups: Array<{ group: string; links: SiteBlock[] }> = [];
  for (const block of section.blocks) {
    const group = settingText(block.settings, "group").trim();
    const existing = groups.find((item) => item.group === group);
    if (existing) existing.links.push(block);
    else groups.push({ group, links: [block] });
  }

  const columns = groups
    .map(
      (group) => `<nav>
  ${group.group ? `<h2>${escapeHtml(group.group)}</h2>` : ""}
  <ul>${group.links
    .map(
      (block) =>
        `<li><a${linkAttrs(settingText(block.settings, "href"))}>${escapeHtml(settingText(block.settings, "label"))}</a></li>`,
    )
    .join("")}</ul>
</nav>`,
    )
    .join("");

  return `<footer class="site-footer"${blockSurfaceAttr(s)}>
  <div class="wrap footer-grid">
    <div>
      <div class="brand">
        ${settingBool(s, "show_logo") && logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" />` : ""}
        <span>${escapeHtml(siteName)}</span>
      </div>
      ${blurb ? `<p class="muted">${escapeHtml(blurb)}</p>` : ""}
    </div>
    ${columns}
  </div>
  <div class="wrap footer-legal">${escapeHtml(copyright)}</div>
</footer>`;
}
