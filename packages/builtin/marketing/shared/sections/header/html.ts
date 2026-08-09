/**
 * 页头的 SSR 渲染。
 *
 * 与页面段不同，页头 / 页脚是**站点级 chrome**：不进段流、不套 `sec-band` 外壳，
 * 由 `ssr-render` 直接放在 `<body>` 两端。客户端的对应实现在 `SiteChrome.tsx`。
 */

import { escapeHtml } from "../../html.js";
import { docMessages, DOCS_INDEX_PATH, type PublicDocSummary  } from "../../marketing-doc.js";
import { settingBool } from "../../section-schema.js";
import { siteNavPages, type PublicSitePage } from "../../site-cms.js";
import { withSiteLocale } from "../../site-locale.js";
import {
  resolveNavItems,
  settingNavItems,
  type ResolvedNavItem,
  type SiteNavContext,
} from "../../site-nav.js";
import { settingText } from "../../section-schema.js";
import { blockSurfaceAttr, linkAttrs } from "../_common/html.js";

import { themeToggleTitle } from "./messages.js";

import type { SiteSection } from "../types.js";
import type { AppLocale } from "@be-water/shared";

export interface LocaleSwitcherOption {
  locale: string;
  /** 已带 locale 前缀的目标路径。 */
  path: string;
  label: string;
  current: boolean;
}

/**
 * 语言切换器：icon + `<details>` dropdown，菜单内是普通 `<a>`。
 *
 * 刻意做成链接而不是按 `Accept-Language` 自动跳转——自动跳转会让爬虫只看到一种语言，
 * 各语言页面互相收录不到（Shopify 同样只做显式切换 + 推荐横幅）。
 * UI 与 client SiteChrome LocaleSwitcher / LocaleToggle 对齐。
 * 附带一小段脚本：点击 details 外部时关闭（原生 details 无 light dismiss）。
 */
const LOCALE_SWITCHER_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`;

/** 首屏图标用太阳；site-enhance 会按当前明暗换成月亮。 */
const THEME_TOGGLE_SUN = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;

/** 首屏按「跟随系统」渲染；site-enhance 读到实际偏好后会改写 title。 */
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
  // 原生 <details> 点外部不会收起；脚本挂在元素后，用 previousElementSibling 绑定自身。
  return `<details class="locale-switcher">
  <summary aria-label="Language">${LOCALE_SWITCHER_ICON}</summary>
  <nav class="locale-switcher-menu" aria-label="Language">${items}</nav>
</details>
<script>(function(){var d=document.currentScript&&document.currentScript.previousElementSibling;if(!d||d.tagName!=="DETAILS")return;document.addEventListener("pointerdown",function(e){if(!d.open)return;if(e.target instanceof Node&&d.contains(e.target))return;d.open=false;});})();</script>`;
}

/**
 * 一条导航项：有子项就画成下拉，没有就是普通链接。
 *
 * 下拉用原生 `<details>` 而不是 JS 菜单——页头首屏就要能点，等 `site-enhance`
 * 加载完再绑事件的话，慢网络上前几秒的点击全是空的。`href` 为空的父项（文档分类
 * 那一层）画成不可点的小标题，不是一个指向 `#` 的假链接。
 */
function renderNavItemHtml(item: ResolvedNavItem): string {
  const label = escapeHtml(item.label);
  if (item.children.length === 0) {
    if (!item.href) return "";
    return `<a${linkAttrs(item.href)}${item.current ? ' aria-current="page"' : ""}>${label}</a>`;
  }

  const children = item.children
    .map((child) => {
      if (child.children.length > 0) {
        /*
         * 分类小标题 + 组内链接：下拉最多铺到这两层，再深就没人点得到了。
         *
         * 整组套一层 `.nav-menu-section`，让 CSS 能把组内链接缩进去。以前小标题和
         * 链接是并排的兄弟节点、同一个左边距，一个分类多的文档库在下拉里就是一串
         * 分不出层次的文字——哪一条是分类名、哪几条属于它，全靠字号那一点差别。
         */
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

/**
 * 页头的文档搜索入口：一个直接提交到文档索引的 `<form>`。
 *
 * 不用 JS 浮层——首屏就得能用，而这个表单在没有 JS 时也照样跳得过去（文档索引
 * 那边的 `?q=` 由 `site-enhance` 接住做过滤，接不住时最坏也只是列出全部文档）。
 */
const SEARCH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

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

/** 展开导航要的内容快照；页头与页脚各自组装一次，形状相同。 */
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

export function renderHeaderHtml(input: {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  /** 品牌区指向的首页（当前语言）。 */
  homeHref: string;
  locales: LocaleSwitcherOption[];
  /** 全站导航（一级页）数据源：`pages` 动态项吃它。 */
  pages?: PublicSitePage[];
  /** 已发布文档目录：文档动态项吃它。 */
  docs?: readonly PublicDocSummary[];
  /**
   * 站里有没有已发布文档（搜索入口据此决定渲不渲染）。
   *
   * 与 `docs` 分开：搜索框只要这个布尔值，而它默认是开的——逼调用方为它查一遍
   * 全库目录，等于每一次页面渲染都多背一份几百行的结果集。
   */
  hasDocs?: boolean;
  /** 当前逻辑路径（不带 locale 前缀），用于 `aria-current`。 */
  currentPath?: string;
  locale?: AppLocale;
  defaultLocale?: AppLocale;
  /**
   * 账户入口（未登录态）的 HTML，由 site-member 经 `registerSiteAccountEntry` 提供。
   * 站点没开通会员、或页头关了 `show_account` 时是空串。
   */
  accountEntryHtml?: string;
}): string {
  const { section, siteName, logoUrl, homeHref, locales } = input;
  const s = section.settings;
  const navItems = resolveNavItems(
    settingNavItems(s),
    headerNavContext(input),
  );
  const links = navItems.map(renderNavItemHtml).join("");
  const secondaryLabel = settingText(s, "secondary_label");
  const secondaryHref = settingText(s, "secondary_href");
  const ctaLabel = settingText(s, "primary_label");
  const ctaHref = settingText(s, "primary_href");
  /*
   * 一篇已发布文档都没有时不渲染搜索框：搜不出任何东西的搜索框比没有更糟，
   * 而且新站点的页头会平白多出一格。同 `show_locale_switcher` 的口径——开关只管
   * 「露不露」，能力具不具备各由数据决定。
   */
  const docSearch =
    settingBool(s, "show_doc_search") &&
    (input.hasDocs ?? (input.docs?.length ?? 0) > 0)
      ? renderDocSearchHtml(input)
      : "";
  const switcher = settingBool(s, "show_locale_switcher")
    ? renderLocaleSwitcherHtml(locales)
    : "";
  // 明暗按钮需要 JS；SSR 先画出挂点，site-enhance 绑定点击并同步图标。
  const themeToggle = settingBool(s, "show_theme_toggle")
    ? renderThemeToggleHtml(input.locale ?? input.defaultLocale ?? "zh-CN")
    : "";
  /*
   * 首屏就把账户入口渲染出来（未登录态），已登录菜单由 site-enhance 升级。
   *
   * 页头是 sticky 的一行，晚出现的按钮会把右侧那一排整体推一下——访客看到的是
   * 「登录」凭空跳出来。爬虫与禁用 JS 的访客更是永远看不到站点有登录入口。
   */
  const accountEntry = settingBool(s, "show_account")
    ? (input.accountEntryHtml ?? "")
    : "";

  return `<header class="site-header${settingBool(s, "sticky") ? " sticky" : ""}"${blockSurfaceAttr(s)}>
  <div class="wrap header-row">
    <a class="brand" href="${escapeHtml(homeHref)}">
      ${settingBool(s, "show_logo") && logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(siteName)}" />` : ""}
      ${settingBool(s, "show_site_name") ? `<span>${escapeHtml(siteName)}</span>` : ""}
    </a>
    <nav class="header-nav">${links}</nav>
    <div class="header-actions">
      ${docSearch}
      ${switcher}
      ${themeToggle}
      ${accountEntry}
      ${secondaryLabel && secondaryHref ? `<a class="btn btn-ghost"${linkAttrs(secondaryHref)}>${escapeHtml(secondaryLabel)}</a>` : ""}
      ${ctaLabel && ctaHref ? `<a class="btn"${linkAttrs(ctaHref)}>${escapeHtml(ctaLabel)}</a>` : ""}
    </div>
  </div>
</header>`;
}
