import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useRef,
} from "react";

import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Link } from "react-router";


import {
  docMessages,
  DOCS_INDEX_PATH, type PublicDocSummary 
} from "../../../shared/marketing-doc.js";
import {
  resolveSurfaceStyle,
  settingBool,
  settingText,
  surfaceStyleCss,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { themeToggleTitle } from "../../../shared/sections/header/messages.js";
import {
  siteNavPages,
  type PageLocaleAlternate,
  type PublicSitePage,
} from "../../../shared/site-cms.js";
import { withSiteLocale } from "../../../shared/site-locale.js";
import {
  resolveNavItems,
  settingNavItems,
  type ResolvedNavItem,
  type SiteNavContext,
} from "../../../shared/site-nav.js";
import { useSiteColorMode } from "../../hooks/use-marketing-site-document-theme.js";
import { siteMemberEntrySlot } from "../../shell/site-member-slots.js";

import { SiteLink } from "./SiteLink.js";


const LOCALE_SWITCHER_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
);

const SUN_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" />
    <path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" />
    <path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MOON_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

/**
 * 会员入口由 slot 填入（Theme Editor 灌 `SiteAccountEntryPreview`）。
 * 公开站页头走 SSR HTML，不经过本组件。
 */
function SiteMemberEntry(): ReactElement | null {
  const Entry = siteMemberEntrySlot.useSlot();
  return Entry ? <Entry /> : null;
}

/**
 * 页头的一条导航项：有子项就是下拉，没有就是普通链接。
 *
 * 与 SSR 的 `renderNavItemHtml` 同构，同样用原生 `<details>`——两端画出来的 DOM
 * 结构一致，同一份 CSS 才管得住两边。
 */
function NavMenuItem({ item }: { item: ResolvedNavItem }): ReactElement | null {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      const details = detailsRef.current;
      if (!details?.open) return;
      const target = event.target;
      if (target instanceof Node && details.contains(target)) return;
      details.open = false;
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (item.children.length === 0) {
    if (!item.href) return null;
    return (
      <SiteLink href={item.href} aria-current={item.current ? "page" : undefined}>
        {item.label}
      </SiteLink>
    );
  }

  return (
    <details ref={detailsRef} className="nav-menu">
      <summary aria-current={item.current ? "page" : undefined}>
        {item.label}
      </summary>
      <nav className="nav-menu-panel">
        {item.children.map((child) =>
          child.children.length > 0 ? (
            // 整组套一层，组内链接才缩得进去（与 SSR 的 `renderNavItemHtml` 同构）
            <div key={child.key} className="nav-menu-section">
              <p className="nav-menu-group">{child.label}</p>
              {child.children.map((leaf) => (
                <NavMenuLeaf key={leaf.key} item={leaf} />
              ))}
            </div>
          ) : (
            <NavMenuLeaf key={child.key} item={child} />
          ),
        )}
      </nav>
    </details>
  );
}

function NavMenuLeaf({ item }: { item: ResolvedNavItem }): ReactElement {
  if (!item.href) return <span>{item.label}</span>;
  return (
    <SiteLink href={item.href} aria-current={item.current ? "page" : undefined}>
      {item.label}
    </SiteLink>
  );
}

const SEARCH_ICON = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/**
 * 页头的文档搜索入口，与 SSR 的 `renderDocSearchHtml` 同构。
 *
 * 就是一个提交到文档索引的 `<form>`：没有 JS 也跳得过去，文档索引那边认 `?q=`。
 */
function DocSearchForm({
  locale,
  defaultLocale,
}: {
  locale?: string;
  defaultLocale?: string;
}): ReactElement {
  const resolved = (locale ?? defaultLocale ?? "zh-CN") as AppLocale;
  const label = docMessages(resolved).search;
  const action =
    locale && defaultLocale
      ? withSiteLocale(
          DOCS_INDEX_PATH,
          locale as AppLocale,
          defaultLocale as AppLocale,
        )
      : DOCS_INDEX_PATH;
  return (
    <form className="header-search" role="search" method="get" action={action}>
      {SEARCH_ICON}
      <input type="search" name="q" placeholder={label} aria-label={label} />
    </form>
  );
}

/** 页脚的一条链接；子项（文档分类那层）缩进列在下面。 */
function FooterMenuItem({ item }: { item: ResolvedNavItem }): ReactElement {
  return (
    <li>
      {item.href ? (
        <SiteLink href={item.href}>{item.label}</SiteLink>
      ) : (
        <span className="footer-group">{item.label}</span>
      )}
      {item.children.length > 0 ? (
        <ul className="footer-sublist">
          {item.children.map((child) => (
            <FooterMenuItem key={child.key} item={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * 语言切换：icon + `<details>` dropdown，**不**按 `Accept-Language` 自动跳转。
 *
 * 自动跳转会让爬虫只看到一种语言，各语言页面互相收录不到（Shopify 同样只做显式切换）。
 * 候选来自本页 `alternates`——只列真的有已发布译文的语言，点进去不会是 404。
 * 目标路径已带 locale 前缀，所以直接用 `Link` 而不是会再改写一次的 `SiteLink`。
 */
function LocaleSwitcher({
  alternates,
  current,
}: {
  alternates: PageLocaleAlternate[];
  current: string;
}): ReactElement | null {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      const details = detailsRef.current;
      if (!details?.open) return;
      const target = event.target;
      if (target instanceof Node && details.contains(target)) return;
      details.open = false;
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  if (alternates.length < 2) return null;
  const currentLabel = getLocaleNativeLabel(current);

  return (
    <details ref={detailsRef} className="locale-switcher">
      <summary aria-label="Language" title={currentLabel}>
        {LOCALE_SWITCHER_ICON}
      </summary>
      <nav className="locale-switcher-menu" aria-label="Language">
        {alternates.map((alternate) => {
          const active = alternate.locale === current;
          return (
            <Link
              key={alternate.locale}
              to={alternate.path}
              hrefLang={alternate.locale}
              aria-current={active ? "true" : undefined}
            >
              {getLocaleNativeLabel(alternate.locale)}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}

/**
 * 明暗切换：点击在 light / dark 间切换。
 *
 * 用站点自己的偏好而**不是**工作台的 `next-themes`：两者同源同一个 SPA，共用
 * `localStorage.theme` 会让访客的选择顺带改掉租户管理台的明暗。
 */
function SiteThemeToggle({ locale }: { locale: AppLocale }): ReactElement {
  const { mode, resolved, setMode } = useSiteColorMode();

  return (
    <button
      type="button"
      className="theme-toggle"
      title={themeToggleTitle(locale, mode)}
      onClick={() => setMode(resolved === "dark" ? "light" : "dark")}
    >
      {resolved === "dark" ? MOON_ICON : SUN_ICON}
    </button>
  );
}

interface ChromeProps {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  /** 编辑器里点击整块可选中；`blockId` 非空表示点在某条链接（block）上。 */
  onSelect?: (blockId: string | null) => void;
}

/**
 * 与页面区块同一套口径：点到哪个 `data-block-id` 就选哪个 block，点在别处选整段。
 * 判空用 `closest` 是否存在而不是 `instanceof`——预览在 iframe 里是另一个 realm。
 */
function clickedBlockId(event: React.MouseEvent): string | null {
  const target = event.target as Element | null;
  if (typeof target?.closest !== "function") return null;
  const block = target.closest("[data-block-id]");
  if (!block || !event.currentTarget.contains(block)) return null;
  return block.getAttribute("data-block-id");
}

function selectable(onSelect: ((blockId: string | null) => void) | undefined) {
  if (!onSelect) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect(clickedBlockId(event));
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(null);
      }
    },
    style: { cursor: "pointer" } as CSSProperties,
  };
}

/** 展开导航要的内容快照；页头页脚共用。 */
function chromeNavContext(input: {
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  currentPath?: string;
  locale?: string;
  defaultLocale?: string;
}): SiteNavContext {
  const defaultLocale = (input.defaultLocale ?? "zh-CN") as AppLocale;
  return {
    navPages: siteNavPages(input.pages ?? []),
    docs: input.docs,
    locale: (input.locale as AppLocale | undefined) ?? defaultLocale,
    defaultLocale,
    currentPath: input.currentPath ?? "",
  };
}

/** 页头 / 页脚共有的导航数据源。 */
interface ChromeNavProps {
  /** 全站导航（一级页）的数据源。 */
  pages?: PublicSitePage[];
  /** 已发布文档目录（文档动态项吃它）。 */
  docs?: readonly PublicDocSummary[];
  /** 站里有没有已发布文档；页头搜索入口据此决定渲不渲染。 */
  hasDocs?: boolean;
  /** 当前逻辑路径，用于 `aria-current`。 */
  currentPath?: string;
  locale?: string;
  defaultLocale?: string;
}

export function SiteHeader({
  section,
  siteName,
  logoUrl,
  onSelect,
  pages = [],
  docs,
  hasDocs,
  currentPath,
  alternates = [],
  locale,
  defaultLocale,
}: ChromeProps &
  ChromeNavProps & {
    /** 本页各语言入口（语言切换器的候选）。 */
    alternates?: PageLocaleAlternate[];
  }): ReactElement {
  const s = section.settings;
  const secondaryLabel = settingText(s, "secondary_label");
  const secondaryHref = settingText(s, "secondary_href");
  const ctaLabel = settingText(s, "primary_label");
  const ctaHref = settingText(s, "primary_href");
  const layout = settingText(s, "layout") || "split";
  const centered = layout === "centered";
  const select = selectable(onSelect);
  const navItems = resolveNavItems(
    settingNavItems(s),
    chromeNavContext({ pages, docs, currentPath, locale, defaultLocale }),
  );
  const surface = resolveSurfaceStyle(s);
  const surfaceCss = {
    ...surfaceStyleCss(surface),
    ...select.style,
  } as CSSProperties;

  const headerClass = ["site-header", settingBool(s, "sticky") ? "sticky" : ""]
    .filter(Boolean)
    .join(" ");

  const rowClass = [
    "wrap",
    "header-row",
    centered ? "header-layout-centered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header
      {...select}
      data-section-id={section.id}
      className={headerClass}
      style={surfaceCss}
    >
      <div className={rowClass}>
        <SiteLink href="/" className="brand">
          {settingBool(s, "show_logo") && logoUrl ? (
            <img src={logoUrl} alt={siteName} className="logo" />
          ) : null}
          {settingBool(s, "show_site_name") ? <span>{siteName}</span> : null}
        </SiteLink>

        <nav className="header-nav">
          {navItems.map((item) => (
            <NavMenuItem key={item.key} item={item} />
          ))}
        </nav>

        <div className="header-actions">
          {/* 一篇已发布文档都没有时不渲染：搜不出东西的搜索框比没有更糟 */}
          {settingBool(s, "show_doc_search") &&
          (hasDocs ?? (docs?.length ?? 0) > 0) ? (
            <DocSearchForm locale={locale} defaultLocale={defaultLocale} />
          ) : null}
          {settingBool(s, "show_locale_switcher") ? (
            <LocaleSwitcher alternates={alternates} current={locale ?? ""} />
          ) : null}
          {/*
            明暗默认跟随设备；这枚按钮只是让访客手动改，关掉不等于锁死浅色。
          */}
          {settingBool(s, "show_theme_toggle") ? (
            <SiteThemeToggle locale={locale === "en" ? "en" : "zh-CN"} />
          ) : null}
          {settingBool(s, "show_account") ? <SiteMemberEntry /> : null}
          {secondaryLabel && secondaryHref ? (
            <SiteLink href={secondaryHref} className="btn btn-ghost">
              {secondaryLabel}
            </SiteLink>
          ) : null}
          {ctaLabel && ctaHref ? (
            <SiteLink href={ctaHref} className="btn">
              {ctaLabel}
            </SiteLink>
          ) : null}
        </div>
      </div>

      {navItems.length > 0 ? (
        <nav className="header-mobile-nav wrap">
          {navItems.map((item) => (
            <NavMenuItem key={item.key} item={item} />
          ))}
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter({
  section,
  siteName,
  logoUrl,
  onSelect,
  pages = [],
  docs,
  currentPath,
  locale,
  defaultLocale,
}: ChromeProps & ChromeNavProps): ReactElement {
  const s = section.settings;
  const blurb = settingText(s, "blurb");
  const copyright =
    settingText(s, "copyright") || `© ${new Date().getFullYear()} ${siteName}`;
  const ctx = chromeNavContext({
    pages,
    docs,
    currentPath,
    locale,
    defaultLocale,
  });
  const columns = section.blocks
    .map((block) => ({
      blockId: block.id,
      title: settingText(block.settings, "title"),
      items: resolveNavItems(settingNavItems(block.settings), ctx),
    }))
    /*
     * 展不出内容的列整列不画。
     *
     * 编辑器里例外：那边正在配置，画一个空列比让它凭空消失好——列没了就点不中。
     */
    .filter((column) => onSelect !== undefined || column.items.length > 0);
  const select = selectable(onSelect);
  const surface = resolveSurfaceStyle(s);
  const surfaceCss = {
    ...surfaceStyleCss(surface),
    ...select.style,
  } as CSSProperties;

  return (
    <footer
      {...select}
      data-section-id={section.id}
      className="site-footer"
      style={surfaceCss}
    >
      <div className="wrap footer-grid">
        <div>
          <div className="brand">
            {settingBool(s, "show_logo") && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="logo" />
            ) : null}
            <span>{siteName}</span>
          </div>
          {blurb ? <p className="muted">{blurb}</p> : null}
        </div>

        {columns.map((column) => (
          <nav key={column.blockId} data-block-id={column.blockId}>
            {column.title ? <h2>{column.title}</h2> : null}
            <ul>
              {column.items.map((item) => (
                <FooterMenuItem key={item.key} item={item} />
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="wrap footer-legal">{copyright}</div>
    </footer>
  );
}
