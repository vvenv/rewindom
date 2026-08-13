/**
 * 页头 / 页脚的 SSR 渲染 —— **一个渲染器**。
 *
 * 页头页脚的差别只有三样：外层元素（`<header>` / `<footer>`）、吸顶、以及默认块。
 * 结构、块类型、定位规则、CSS 全是同一套，所以渲染也只该有一份。以前是两份，于是
 * 「底栏那排链接」在页脚要新造字段、「页头两行」根本排不出来。
 *
 * 与客户端 `SiteChrome.tsx` 同构：同一批 class、同一套 DOM 结构，共用一份 CSS。
 */

import { escapeHtml } from "../../html.js";
import { registerSectionCss } from "../../load-marketing-site-css.js";
import { settingBool, settingText } from "../../section-schema.js";
import {
  resolveNavItems,
  settingNavItems,
  type ResolvedNavItem,
  type SiteNavContext,
} from "../../site-nav.js";

import {
  blockMobile,
  getContributedChromeBlock,
  registerChromeBlock,
} from "./chrome-blocks.js";
import { chromeBlockClass, chromeRows, type ChromeRow } from "./chrome-layout.js";
import { chromeMenuLabel, mainNavLabel, themeToggleTitle } from "./chrome-messages.js";
import { resolveChromeText } from "./chrome-text.js";
import { linkAttrs } from "./html.js";

import type { SiteBlock, SiteSection } from "../types.js";
import type { AppLocale } from "@rewindom/shared";

export interface LocaleSwitcherOption {
  locale: string;
  path: string;
  label: string;
  current: boolean;
}

/** 渲染一个 chrome 区域要的一切。两端同一份，别在任何一边偷偷多读一个字段。 */
export interface ChromeRenderInput {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  homeHref: string;
  ctx: SiteNavContext;
  locales: LocaleSwitcherOption[];
  /** 会员入口的 SSR 片段（由 site-member 模块灌进来）。 */
  accountEntryHtml?: string;
  /** 贡献段 / 贡献 chrome 块的按请求数据。 */
  contributed?: Readonly<Record<string, unknown>>;
  /** 贡献 chrome 块按租户开通与否决定渲不渲染。 */
  enabledEntitlements?: ReadonlySet<string>;
}

export type ChromeBlockHtmlRenderer = (
  block: SiteBlock,
  input: ChromeRenderInput,
) => string;

const CHROME_BLOCK_HTML = new Map<string, ChromeBlockHtmlRenderer>();

/**
 * 业务模块贡献一个 chrome 块的 **SSR 侧**入口。
 *
 * 与 `registerSiteSectionHtml` 成对形状：定义只写一份，两端各自登记渲染器。
 * 在模块 `onBoot` 里调。
 */
export function registerChromeBlockHtml(
  definition: Parameters<typeof registerChromeBlock>[0],
  render: ChromeBlockHtmlRenderer,
  options: { css?: string } = {},
): void {
  registerChromeBlock(definition);
  CHROME_BLOCK_HTML.set(definition.type, render);
  if (options.css) registerSectionCss(definition.type, options.css);
}

/** 仅供测试。 */
export function resetChromeBlockHtml(): void {
  CHROME_BLOCK_HTML.clear();
}

const ICON = {
  locale: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
} as const;

/** 点开外面收起来。每个下拉自带一份，所以同页出现几个都各管各的。 */
const CLOSE_ON_OUTSIDE = `<script>(function(){var d=document.currentScript&&document.currentScript.previousElementSibling;if(!d||d.tagName!=="DETAILS")return;document.addEventListener("pointerdown",function(e){if(!d.open)return;if(e.target instanceof Node&&d.contains(e.target))return;d.open=false;});})();</script>`;

function renderBrandHtml(input: {
  block: SiteBlock;
  siteName: string;
  logoUrl: string | null;
  homeHref: string;
}): string {
  const s = input.block.settings;
  const blurb = settingText(s, "blurb");
  const mark = `<a class="brand" href="${escapeHtml(input.homeHref)}">
      ${settingBool(s, "show_logo") && input.logoUrl ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" alt="${escapeHtml(input.siteName)}" />` : ""}
      ${settingBool(s, "show_site_name") ? `<span>${escapeHtml(input.siteName)}</span>` : ""}
    </a>`;
  // 有简介才需要外面那层：没有的话品牌本身就是一个 `<a>`，多包一层只会多一个盒子
  return blurb
    ? `<div class="chrome-brand">${mark}<p class="muted">${escapeHtml(blurb)}</p></div>`
    : `<div class="chrome-brand">${mark}</div>`;
}

/** 一条导航项：有子项就是下拉（横排）或缩进子列表（竖列）。 */
function renderNavItemHtml(item: ResolvedNavItem, column: boolean): string {
  const label = escapeHtml(item.label);
  if (item.children.length === 0) {
    if (!item.href) return column ? `<li><span class="nav-group">${label}</span></li>` : "";
    const link = `<a${linkAttrs(item.href)}${item.current ? ' aria-current="page"' : ""}>${label}</a>`;
    return column ? `<li>${link}</li>` : link;
  }

  if (column) {
    // 竖列里就地缩进展开：一列链接下面挂一个浮层下拉没有意义
    return `<li>${
      item.href
        ? `<a${linkAttrs(item.href)}>${label}</a>`
        : `<span class="nav-group">${label}</span>`
    }<ul class="nav-sublist">${item.children
      .map((child) => renderNavItemHtml(child, true))
      .join("")}</ul></li>`;
  }

  const children = item.children
    .map((child) =>
      child.children.length > 0
        ? `<div class="nav-menu-section"><p class="nav-menu-group">${escapeHtml(
            child.label,
          )}</p>${child.children.map(renderNavLeafHtml).join("")}</div>`
        : renderNavLeafHtml(child),
    )
    .join("");
  return `<details class="nav-menu">
  <summary${item.current ? ' aria-current="page"' : ""}>${label}</summary>
  <nav class="nav-menu-panel">${children}</nav>
</details>${CLOSE_ON_OUTSIDE}`;
}

function renderNavLeafHtml(item: ResolvedNavItem): string {
  if (!item.href) return `<span>${escapeHtml(item.label)}</span>`;
  return `<a${linkAttrs(item.href)}${item.current ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`;
}

/**
 * 导航块。
 *
 * 有标题才当 landmark（`<nav aria-label>`）：无名的 `<nav>` 只会把读屏器的跳转列表
 * 撑满。页头主导航是唯一的例外——它天然叫「主导航」，由调用方传 `fallbackLabel`。
 */
function renderNavHtml(input: {
  block: SiteBlock;
  ctx: SiteNavContext;
  fallbackLabel?: string;
}): string {
  const items = resolveNavItems(settingNavItems(input.block.settings), input.ctx);
  if (items.length === 0) return "";
  const column = settingText(input.block.settings, "display") === "column";
  const title = settingText(input.block.settings, "title");
  const label = title || input.fallbackLabel || "";
  const body = column
    ? `${title ? `<h2>${escapeHtml(title)}</h2>` : ""}<ul>${items
        .map((item) => renderNavItemHtml(item, true))
        .join("")}</ul>`
    : items.map((item) => renderNavItemHtml(item, false)).join("");
  const cls = `chrome-nav ${column ? "chrome-nav-column" : "chrome-nav-inline"}`;
  return label
    ? `<nav class="${cls}" aria-label="${escapeHtml(label)}">${body}</nav>`
    : `<div class="${cls}">${body}</div>`;
}

function renderButtonHtml(block: SiteBlock): string {
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
  return `<a class="${className}"${linkAttrs(href)}>${escapeHtml(label)}</a>`;
}

function renderLocaleHtml(options: LocaleSwitcherOption[]): string {
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
  <summary aria-label="Language">${ICON.locale}</summary>
  <nav class="locale-switcher-menu" aria-label="Language">${items}</nav>
</details>${CLOSE_ON_OUTSIDE}`;
}

/**
 * SSR 一律吐「跟随系统」那一版，落地后由 site-enhance 按 `localStorage` 改写标题与
 * 图标——它扫的是**所有** `button.theme-toggle`，页头页脚各挂一个也同步得到。
 */
function renderThemeHtml(locale: AppLocale): string {
  const title = escapeHtml(themeToggleTitle(locale, "system"));
  return `<button type="button" class="theme-toggle" title="${title}">${ICON.sun}</button>`;
}

function renderBlockHtml(block: SiteBlock, input: ChromeRenderInput, isMainNav: boolean): string {
  switch (block.type) {
    case "chrome_brand":
      return renderBrandHtml({
        block,
        siteName: input.siteName,
        logoUrl: input.logoUrl,
        homeHref: input.homeHref,
      });
    case "chrome_nav":
      return renderNavHtml({
        block,
        ctx: input.ctx,
        fallbackLabel: isMainNav ? mainNavLabel(input.ctx.locale) : undefined,
      });
    case "chrome_text": {
      const text = resolveChromeText(settingText(block.settings, "text"), {
        siteName: input.siteName,
      });
      return text ? `<p class="chrome-text">${escapeHtml(text)}</p>` : "";
    }
    case "chrome_button":
      return renderButtonHtml(block);
    case "chrome_locale":
      return renderLocaleHtml(input.locales);
    case "chrome_theme":
      return renderThemeHtml(input.ctx.locale);
    case "chrome_account":
      return input.accountEntryHtml ?? "";
    default: {
      const contributed = getContributedChromeBlock(block.type);
      if (!contributed) return "";
      if (
        contributed.entitlement &&
        !input.enabledEntitlements?.has(contributed.entitlement)
      ) {
        return "";
      }
      return CHROME_BLOCK_HTML.get(block.type)?.(block, input) ?? "";
    }
  }
}

/**
 * 一个块外面那层壳。
 *
 * `data-block-id` 是编辑器点选的锚点（往上找最近的 `[data-block-id]`），所以每个块
 * 都得有一层自己的元素——不能指望块内部记得加。
 */
function wrapBlockHtml(block: SiteBlock, inner: string): string {
  if (!inner) return "";
  const cls = chromeBlockClass(block, "chrome-block");
  const shell = `<div class="${cls}" data-block-id="${escapeHtml(block.id)}">${inner}</div>`;
  // 窄屏收进菜单的块多包一层：桌面上它是 `display: contents`，等于不存在
  return blockMobile(block) === "menu"
    ? `<div class="chrome-drawer">${shell}</div>`
    : shell;
}

function renderRowHtml(
  row: ChromeRow,
  input: ChromeRenderInput,
  sectionId: string,
  // 「第一条导航」是整个区域里的第一条，不是每一行的第一条——按行重置的话，两行导航
  // 会各自叫一次「主导航」，读屏器的 landmark 列表里又是两个同名项
  state: { mainNavUsed: boolean },
): string {
  const zones = row.zones
    .map((zone) => {
      const blocks = zone.blocks
        .map((block) => {
          const isMainNav = block.type === "chrome_nav" && !state.mainNavUsed;
          if (isMainNav) state.mainNavUsed = true;
          return wrapBlockHtml(block, renderBlockHtml(block, input, isMainNav));
        })
        .join("");
      return blocks
        ? `<div class="chrome-zone chrome-zone-${zone.align}">${blocks}</div>`
        : "";
    })
    .join("");
  if (!zones) return "";

  /*
   * 汉堡：一个画成图标的 checkbox，不是 `<button>` + JS，也不是 label + 隐藏 input。
   *
   * checkbox 自带「开 / 关」状态与键盘操作（空格），纯 CSS 就能驱动展开，无 JS 可用；
   * 用 label 包一个隐藏 input 则键盘上根本聚焦不到。展开靠 `:has()` 从行选到 drawer
   * ——drawer 分散在各个对齐区里，和 input 不是兄弟，`~` 够不着。
   */
  const menuId = `chrome-menu-${escapeHtml(sectionId)}-${row.index}`;
  const menu = row.hasMenu
    ? `<input type="checkbox" id="${menuId}" class="chrome-menu-toggle" aria-label="${escapeHtml(chromeMenuLabel(input.ctx.locale))}" />`
    : "";
  return `<div class="wrap chrome-row chrome-row-${row.index}">${zones}${menu}</div>`;
}

export function renderChromeHtml(
  tag: "header" | "footer",
  className: string,
  styleAttr: string,
  input: ChromeRenderInput,
): string {
  const state = { mainNavUsed: false };
  const rows = chromeRows(input.section.blocks)
    .map((row) => renderRowHtml(row, input, input.section.id, state))
    .filter(Boolean)
    .join("");
  return `<${tag} class="${className}"${styleAttr ? ` style="${styleAttr}"` : ""}>${rows}</${tag}>`;
}
