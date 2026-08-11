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
  DOCS_INDEX_PATH,
  type PublicDocSummary,
} from "../../../shared/marketing-doc.js";
import {
  resolveSurfaceStyle,
  settingBool,
  settingText,
  surfaceStyleCss,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { partitionHeaderBlocks } from "../../../shared/sections/_common/chrome-blocks.js";
import {
  headerNavLabel,
  themeToggleTitle,
} from "../../../shared/sections/header/messages.js";
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
      <SiteLink
        href={item.href}
        aria-current={item.current ? "page" : undefined}
      >
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
  const layout = settingText(s, "layout") || "split";
  const centered = layout === "centered";
  const select = selectable(onSelect);
  const ctx = chromeNavContext({
    pages,
    docs,
    currentPath,
    locale,
    defaultLocale,
  });
  const { brand, nav, actions } = partitionHeaderBlocks(section.blocks);
  const navLocale = ((locale ?? defaultLocale) as AppLocale | undefined) ?? "zh-CN";
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

  const mobileNavItems = nav.flatMap((block) =>
    resolveNavItems(settingNavItems(block.settings), ctx),
  );

  return (
    <header
      {...select}
      data-section-id={section.id}
      className={headerClass}
      style={surfaceCss}
    >
      <div className={rowClass}>
        {brand.map((block) => (
          <SiteLink
            key={block.id}
            href="/"
            className="brand"
            data-block-id={block.id}
          >
            {settingBool(block.settings, "show_logo") && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="logo" />
            ) : null}
            {settingBool(block.settings, "show_site_name") ? (
              <span>{siteName}</span>
            ) : null}
          </SiteLink>
        ))}

        {nav.map((block) => {
          const navItems = resolveNavItems(
            settingNavItems(block.settings),
            ctx,
          );
          if (navItems.length === 0) return null;
          return (
            <nav
              key={block.id}
              className="header-nav"
              aria-label={headerNavLabel(navLocale)}
              data-block-id={block.id}
            >
              {navItems.map((item) => (
                <NavMenuItem key={item.key} item={item} />
              ))}
            </nav>
          );
        })}

        {actions.length > 0 ? (
          <div className="header-actions">
            {actions.map((block) => (
              <HeaderActionBlock
                key={block.id}
                block={block}
                hasDocs={hasDocs}
                docs={docs}
                locale={locale}
                defaultLocale={defaultLocale}
                alternates={alternates}
              />
            ))}
          </div>
        ) : null}
      </div>

      {mobileNavItems.length > 0 ? (
        <nav
          className="header-mobile-nav wrap"
          aria-label={headerNavLabel(navLocale, "mobile")}
        >
          {mobileNavItems.map((item) => (
            <NavMenuItem key={item.key} item={item} />
          ))}
        </nav>
      ) : null}
    </header>
  );
}

function HeaderActionBlock({
  block,
  hasDocs,
  docs,
  locale,
  defaultLocale,
  alternates,
}: {
  block: SiteBlock;
  hasDocs?: boolean;
  docs?: readonly PublicDocSummary[];
  locale?: string;
  defaultLocale?: string;
  alternates: PageLocaleAlternate[];
}): ReactElement | null {
  switch (block.type) {
    case "chrome_doc_search":
      return (hasDocs ?? (docs?.length ?? 0) > 0) ? (
        <DocSearchForm locale={locale} defaultLocale={defaultLocale} />
      ) : null;
    case "chrome_locale":
      return <LocaleSwitcher alternates={alternates} current={locale ?? ""} />;
    case "chrome_theme":
      return <SiteThemeToggle locale={locale === "en" ? "en" : "zh-CN"} />;
    case "chrome_account":
      return <SiteMemberEntry />;
    case "chrome_button": {
      const label = settingText(block.settings, "label");
      const href = settingText(block.settings, "href");
      if (!label || !href) return null;
      const variant = settingText(block.settings, "variant") || "primary";
      const className =
        variant === "ghost"
          ? "btn btn-ghost"
          : variant === "secondary"
            ? "btn btn-secondary"
            : "btn";
      return (
        <SiteLink href={href} className={className} data-block-id={block.id}>
          {label}
        </SiteLink>
      );
    }
    default:
      return null;
  }
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
  const ctx = chromeNavContext({
    pages,
    docs,
    currentPath,
    locale,
    defaultLocale,
  });
  const select = selectable(onSelect);
  const surface = resolveSurfaceStyle(s);
  const surfaceCss = {
    ...surfaceStyleCss(surface),
    ...select.style,
  } as CSSProperties;

  const gridBlocks: ReactElement[] = [];
  const legalBlocks: ReactElement[] = [];

  for (const block of section.blocks) {
    switch (block.type) {
      case "chrome_brand": {
        const blurb = settingText(block.settings, "blurb");
        gridBlocks.push(
          <div key={block.id} data-block-id={block.id}>
            <div className="brand">
              {settingBool(block.settings, "show_logo") && logoUrl ? (
                <img src={logoUrl} alt={siteName} className="logo" />
              ) : null}
              {settingBool(block.settings, "show_site_name") ? (
                <span>{siteName}</span>
              ) : null}
            </div>
            {blurb ? <p className="muted">{blurb}</p> : null}
          </div>,
        );
        break;
      }
      case "menu_column": {
        const items = resolveNavItems(settingNavItems(block.settings), ctx);
        if (onSelect === undefined && items.length === 0) break;
        const title = settingText(block.settings, "title");
        const list = (
          <ul>
            {items.map((item) => (
              <FooterMenuItem key={item.key} item={item} />
            ))}
          </ul>
        );
        // 有列标题才当 landmark（口径与 SSR 的 renderFooterMenuColumnHtml 一致）
        gridBlocks.push(
          title ? (
            <nav key={block.id} aria-label={title} data-block-id={block.id}>
              <h2>{title}</h2>
              {list}
            </nav>
          ) : (
            <div key={block.id} data-block-id={block.id}>
              {list}
            </div>
          ),
        );
        break;
      }
      case "chrome_copyright": {
        const text =
          settingText(block.settings, "text") ||
          `© ${new Date().getFullYear()} ${siteName}`;
        legalBlocks.push(
          <div
            key={block.id}
            className="wrap footer-legal"
            data-block-id={block.id}
          >
            {text}
          </div>,
        );
        break;
      }
      default:
        break;
    }
  }

  return (
    <footer
      {...select}
      data-section-id={section.id}
      className="site-footer"
      style={surfaceCss}
    >
      {gridBlocks.length > 0 ? (
        <div className="wrap footer-grid">{gridBlocks}</div>
      ) : null}
      {legalBlocks}
    </footer>
  );
}
