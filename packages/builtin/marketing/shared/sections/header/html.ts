/**
 * 页头的 SSR 渲染（block 组合版）。
 */

import { escapeHtml } from "../../html.js";
import {
  docMessages,
  DOCS_INDEX_PATH,
  type PublicDocSummary,
} from "../../marketing-doc.js";
import {
  settingBool,
  settingText,
  type SiteBlock,
} from "../../section-schema.js";
import { siteNavPages, type PublicSitePage } from "../../site-cms.js";
import { withSiteLocale } from "../../site-locale.js";
import {
  resolveNavItems,
  settingNavItems,
  type ResolvedNavItem,
  type SiteNavContext,
} from "../../site-nav.js";
import { partitionHeaderBlocks } from "../_common/chrome-blocks.js";
import { blockSurfaceAttr, linkAttrs } from "../_common/html.js";

import { themeToggleTitle } from "./messages.js";

import type { SiteSection } from "../types.js";
import type { AppLocale } from "@be-water/shared";

export interface LocaleSwitcherOption {
  locale: string;
  path: string;
  label: string;
  current: boolean;
}

const LOCALE_SWITCHER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;
const THEME_TOGGLE_SUN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

function renderThemeToggleHtml(locale: AppLocale): string {
  const title = escapeHtml(themeToggleTitle(locale, "system"));
  return `<button type="button" class="theme-toggle" title="${title}">${THEME_TOGGLE_SUN}</button>`;
}

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
</details>
<script>(function(){var d=document.currentScript&&document.currentScript.previousElementSibling;if(!d||d.tagName!=="DETAILS")return;document.addEventListener("pointerdown",function(e){if(!d.open)return;if(e.target instanceof Node&&d.contains(e.target))return;d.open=false;});})();</script>`;
}

function renderNavItemHtml(item: ResolvedNavItem): string {
  const label = escapeHtml(item.label);
  if (item.children.length === 0) {
    if (!item.href) return "";
    return `<a${linkAttrs(item.href)}${item.current ? ' aria-current="page"' : ""}>${label}</a>`;
  }
  const children = item.children
    .map((child) => {
      if (child.children.length > 0) {
        return `<div class="nav-menu-section"><p class="nav-menu-group">${escapeHtml(
          child.label,
        )}</p>${child.children.map((leaf) => renderNavLeafHtml(leaf)).join("")}</div>`;
      }
      return renderNavLeafHtml(child);
    })
    .join("");
  return `<details class="nav-menu">
  <summary${item.current ? ' aria-current="page"' : ""}>${label}</summary>
  <nav class="nav-menu-panel">${children}</nav>
</details>
<script>(function(){var d=document.currentScript&&document.currentScript.previousElementSibling;if(!d||d.tagName!=="DETAILS")return;document.addEventListener("pointerdown",function(e){if(!d.open)return;if(e.target instanceof Node&&d.contains(e.target))return;d.open=false;});})();</script>`;
}

function renderNavLeafHtml(item: ResolvedNavItem): string {
  if (!item.href) return `<span>${escapeHtml(item.label)}</span>`;
  return `<a${linkAttrs(item.href)}${item.current ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`;
}

function renderDocSearchHtml(input: {
  locale?: AppLocale;
  defaultLocale?: AppLocale;
}): string {
  const locale = input.locale ?? input.defaultLocale ?? "zh-CN";
  const label = escapeHtml(docMessages(locale).search);
  const action =
    input.locale && input.defaultLocale
      ? withSiteLocale(DOCS_INDEX_PATH, input.locale, input.defaultLocale)
      : DOCS_INDEX_PATH;
  return `<form class="header-search" role="search" method="get" action="${escapeHtml(action)}">
  ${SEARCH_ICON}
  <input type="search" name="q" placeholder="${label}" aria-label="${label}" />
</form>`;
}

function headerNavContext(input: {
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
}): SiteNavContext {
  const defaultLocale = input.defaultLocale ?? "zh-CN";
  return {
    navPages: siteNavPages(input.pages ?? []),
    docs: input.docs,
    locale: input.locale ?? defaultLocale,
    defaultLocale,
    currentPath: input.currentPath ?? "",
  };
}

function renderHeaderBrandHtml(input: {
  block: SiteBlock;
  siteName: string;
  logoUrl: string | null;
  homeHref: string;
}): string {
  const s = input.block.settings;
  return `<a class="brand" data-block-id="${escapeHtml(input.block.id)}" href="${escapeHtml(input.homeHref)}">
      ${settingBool(s, "show_logo") && input.logoUrl ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(input.siteName)}" />` : ""}
      ${settingBool(s, "show_site_name") ? `<span>${escapeHtml(input.siteName)}</span>` : ""}
    </a>`;
}

function renderHeaderNavHtml(input: {
  block: SiteBlock;
  ctx: SiteNavContext;
}): string {
  const items = resolveNavItems(
    settingNavItems(input.block.settings),
    input.ctx,
  );
  if (items.length === 0) return "";
  return `<nav class="header-nav" data-block-id="${escapeHtml(input.block.id)}">${items.map(renderNavItemHtml).join("")}</nav>`;
}

function renderHeaderButtonHtml(block: SiteBlock): string {
  const label = settingText(block.settings, "label");
  const href = settingText(block.settings, "href");
  if (!label || !href) return "";
  const variant = settingText(block.settings, "variant") || "primary";
  const className =
    variant === "ghost"
      ? "btn btn-ghost"
      : variant === "secondary"
        ? "btn btn-secondary"
        : "btn";
  return `<a class="${className}" data-block-id="${escapeHtml(block.id)}"${linkAttrs(href)}>${escapeHtml(label)}</a>`;
}

export function renderHeaderHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  homeHref: string;
  locales: LocaleSwitcherOption[];
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  hasDocs?: boolean;
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
  accountEntryHtml?: string;
}): string {
  const { section, siteName, logoUrl, homeHref, locales } = input;
  const s = section.settings;
  const layout = settingText(s, "layout") || "split";
  const centered = layout === "centered";
  const ctx = headerNavContext(input);
  const { brand, nav, actions } = partitionHeaderBlocks(section.blocks);

  const brandHtml = brand
    .map((block) =>
      renderHeaderBrandHtml({ block, siteName, logoUrl, homeHref }),
    )
    .join("");
  const navHtml = nav
    .map((block) => renderHeaderNavHtml({ block, ctx }))
    .join("");

  const actionsHtml = actions
    .map((block) => {
      switch (block.type) {
        case "chrome_doc_search":
          return (input.hasDocs ?? (input.docs?.length ?? 0) > 0)
            ? renderDocSearchHtml(input)
            : "";
        case "chrome_locale":
          return renderLocaleSwitcherHtml(locales);
        case "chrome_theme":
          return renderThemeToggleHtml(
            input.locale ?? input.defaultLocale ?? "zh-CN",
          );
        case "chrome_account":
          return input.accountEntryHtml ?? "";
        case "chrome_button":
          return renderHeaderButtonHtml(block);
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("");

  const mobileNavItems = nav.flatMap((block) =>
    resolveNavItems(settingNavItems(block.settings), ctx),
  );
  const mobileNav =
    mobileNavItems.length > 0
      ? `<nav class="header-mobile-nav wrap">${mobileNavItems.map(renderNavItemHtml).join("")}</nav>`
      : "";

  const rowClass = [
    "wrap",
    "header-row",
    centered ? "header-layout-centered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `<header class="site-header${settingBool(s, "sticky") ? " sticky" : ""}"${blockSurfaceAttr(s)}>
  <div class="${rowClass}">
    ${brandHtml}
    ${navHtml}
    ${actionsHtml ? `<div class="header-actions">${actionsHtml}</div>` : ""}
  </div>
  ${mobileNav}
</header>`;
}
