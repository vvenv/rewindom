/**
 * SSR 侧的 section 渲染：与 `client/components/sections/` 一一对应。
 *
 * 两处渲染吃同一份 schema（`shared/section-registry.ts`），新增字段要同时改这里；
 * SEO 正文以本文件为准，客户端只是水合后的可读 UI。
 */

import { marked } from "marked";

import {
  resolveSectionLayout,
  settingBool,
  settingLines,
  settingNumber,
  settingText,
  type SettingValues,
  type SiteBlock,
  type SiteSection,
} from "../shared/section-schema.js";

import { escapeHtml } from "./site.util.js";

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
      return `<li class="card">
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
      return `<li class="card">
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
  if (block.type === "stat") {
    const label = settingText(block.settings, "label");
    return `<li class="${cls}"><strong class="stat-value">${escapeHtml(settingText(block.settings, "value"))}</strong>${
      label ? `<p class="muted">${escapeHtml(label)}</p>` : ""
    }</li>`;
  }
  const body = settingText(block.settings, "body");
  const href = settingText(block.settings, "href");
  const inner = `<span class="title">${escapeHtml(settingText(block.settings, "title"))}</span>${
    body ? `<span class="muted">${escapeHtml(body)}</span>` : ""
  }`;
  if (href) {
    return `<li><a class="${cls}"${linkAttrs(href)}>${inner}</a></li>`;
  }
  return `<li class="${cls}">${inner}</li>`;
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
      return `<li class="plan${featured ? " featured" : ""}">
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
      return `<div class="qa">
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

function renderSplit(section: SiteSection): string {
  const s = section.settings;
  const body = settingText(s, "body");
  const aside = `<div class="prose">${md(settingText(s, "aside_md"))}</div>`;
  const main = `<div>
    <h2>${escapeHtml(settingText(s, "title"))}</h2>
    ${body ? `<p class="lead">${escapeHtml(body)}</p>` : ""}
    ${buttonRow(s, "left")}
  </div>`;
  const mediaFirst = settingText(s, "media_position") === "start";
  return `<div class="split">${mediaFirst ? `${aside}${main}` : `${main}${aside}`}</div>`;
}

/** 版式（留白 / 底色 / 分隔线 / 窄栏）统一由外层 `<section>` 承担。 */
function renderSectionInner(section: SiteSection): string {
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
    case "pricing":
      return renderPricing(section);
    case "faq":
      return renderFaq(section);
    case "band":
      return renderBand(section);
    case "split":
      return renderSplit(section);
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
export function renderSectionHtml(section: SiteSection, gap = 0): string {
  const inner = renderSectionInner(section);
  if (!inner) return "";
  const layout = resolveSectionLayout(section.settings);
  const classes = [
    "sec-band",
    `sec-w-${layout.width}`,
    layout.background !== "none" ? `sec-bg-${layout.background}` : "",
    layout.dividerTop ? "sec-divider-top" : "",
    layout.dividerBottom ? "sec-divider-bottom" : "",
  ]
    .filter(Boolean)
    .join(" ");
  // 存的是桌面值，窄屏由 `.sec` / `.sec-band` 的媒体查询按比例缩
  const style = `--sec-pt:${layout.paddingTop}px;--sec-pb:${layout.paddingBottom}px`;
  const id = layout.anchor ? ` id="${escapeHtml(layout.anchor)}"` : "";
  return `<section${id} class="sec" style="--sec-gap:${gap}px"><div class="${classes}" style="${style}"><div class="sec-content sec-c-${layout.contentWidth}">${inner}</div></div></section>`;
}

/* -------------------------------------------------------------------------- */
/* 页头 / 页脚                                                                 */
/* -------------------------------------------------------------------------- */

export function renderHeaderHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
}): string {
  const { section, siteName, logoUrl } = input;
  const s = section.settings;
  const links = section.blocks
    .map(
      (block) =>
        `<a${linkAttrs(settingText(block.settings, "href"))}>${escapeHtml(settingText(block.settings, "label"))}</a>`,
    )
    .join("");
  const loginLabel = settingText(s, "login_label") || "Login";
  const ctaLabel = settingText(s, "primary_label");
  const ctaHref = settingText(s, "primary_href");

  return `<header class="site-header${settingBool(s, "sticky") ? " sticky" : ""}">
  <div class="wrap header-row">
    <a class="brand" href="/">
      ${settingBool(s, "show_logo") && logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" />` : ""}
      ${settingBool(s, "show_site_name") ? `<span>${escapeHtml(siteName)}</span>` : ""}
    </a>
    <nav class="header-nav">${links}</nav>
    <div class="header-actions">
      ${settingBool(s, "show_login") ? `<a class="btn btn-ghost" href="/login">${escapeHtml(loginLabel)}</a>` : ""}
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

  return `<footer class="site-footer">
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
