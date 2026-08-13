import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import { getLocaleNativeLabel, type AppLocale } from "@rewindom/shared";
import { Link } from "react-router";

import {
  docMessages,
  DOCS_INDEX_PATH,
  type PublicDocSummary,
} from "../../../shared/marketing-doc.js";
import {
  resolveSurfaceStyle,
  settingBool,
  settingNumber,
  settingText,
  surfaceStyleCss,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import { blockMobile } from "../../../shared/sections/_common/chrome-blocks.js";
import {
  chromeBlockClass,
  chromeRows,
} from "../../../shared/sections/_common/chrome-layout.js";
import {
  chromeMenuLabel,
  mainNavLabel,
  themeToggleTitle,
} from "../../../shared/sections/_common/chrome-messages.js";
import {
  chromeShellVarsAttr,
  resolveChromeShell,
} from "../../../shared/sections/_common/chrome-shell.js";
import { resolveChromeText } from "../../../shared/sections/_common/chrome-text.js";
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

import { getChromeBlockView } from "./chrome-views.js";
import { SiteLink } from "./SiteLink.js";


/* -------------------------------------------------------------------------- */
/* 图标                                                                        */
/* -------------------------------------------------------------------------- */

const ICON_PROPS = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const LOCALE_ICON = (
  <svg {...ICON_PROPS}>
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
);

const SUN_ICON = (
  <svg {...ICON_PROPS}>
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
  <svg {...ICON_PROPS}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
);

const SEARCH_ICON = (
  <svg {...ICON_PROPS}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/* 块                                                                          */
/* -------------------------------------------------------------------------- */

/** 会员入口由 slot 填入；公开站页头走 SSR HTML，不经过本组件。 */
function MemberEntry(): ReactElement | null {
  const Entry = siteMemberEntrySlot.useSlot();
  return Entry ? <Entry /> : null;
}

/** 点开外面收起来。与 SSR 那段内联脚本同一行为。 */
function useCloseOnOutside(ref: React.RefObject<HTMLDetailsElement | null>): void {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      const details = ref.current;
      if (!details?.open) return;
      const target = event.target;
      if (target instanceof Node && details.contains(target)) return;
      details.open = false;
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref]);
}

/** 横排导航的一条：有子项就是下拉。与 SSR 的 `renderNavItemHtml` 同构。 */
function NavMenuItem({ item }: { item: ResolvedNavItem }): ReactElement | null {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseOnOutside(detailsRef);

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

/** 竖列导航的一条：子项就地缩进列在下面。 */
function NavColumnItem({ item }: { item: ResolvedNavItem }): ReactElement {
  return (
    <li>
      {item.href ? (
        <SiteLink href={item.href}>{item.label}</SiteLink>
      ) : (
        <span className="nav-group">{item.label}</span>
      )}
      {item.children.length > 0 ? (
        <ul className="nav-sublist">
          {item.children.map((child) => (
            <NavColumnItem key={child.key} item={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ChromeNav({
  block,
  ctx,
  fallbackLabel,
}: {
  block: SiteBlock;
  ctx: SiteNavContext;
  fallbackLabel?: string;
}): ReactElement | null {
  const items = resolveNavItems(settingNavItems(block.settings), ctx);
  if (items.length === 0) return null;
  const column = settingText(block.settings, "display") === "column";
  const title = settingText(block.settings, "title");
  const label = title || fallbackLabel || "";
  const className = `chrome-nav ${column ? "chrome-nav-column" : "chrome-nav-inline"}`;
  const body = column ? (
    <>
      {title ? <h2>{title}</h2> : null}
      <ul>
        {items.map((item) => (
          <NavColumnItem key={item.key} item={item} />
        ))}
      </ul>
    </>
  ) : (
    items.map((item) => <NavMenuItem key={item.key} item={item} />)
  );

  // 有名字才当 landmark：一排无名 `<nav>` 只会把读屏器的跳转列表撑满
  return label ? (
    <nav className={className} aria-label={label}>
      {body}
    </nav>
  ) : (
    <div className={className}>{body}</div>
  );
}

function DocSearchForm({ ctx }: { ctx: SiteNavContext }): ReactElement {
  const label = docMessages(ctx.locale).search;
  const action = withSiteLocale(DOCS_INDEX_PATH, ctx.locale, ctx.defaultLocale);
  return (
    <form className="chrome-search" role="search" method="get" action={action}>
      {SEARCH_ICON}
      <input type="search" name="q" placeholder={label} aria-label={label} />
    </form>
  );
}

/**
 * 语言切换：**不**按 `Accept-Language` 自动跳转。
 *
 * 自动跳转会让爬虫只看到一种语言，各语言页面互相收录不到。候选来自本页 `alternates`
 * ——只列真的有已发布译文的语言，点进去不会是 404。目标路径已带 locale 前缀，所以用
 * `Link` 而不是会再改写一次的 `SiteLink`。
 */
function LocaleSwitcher({
  alternates,
  current,
}: {
  alternates: PageLocaleAlternate[];
  current: string;
}): ReactElement | null {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useCloseOnOutside(detailsRef);

  if (alternates.length < 2) return null;

  return (
    <details ref={detailsRef} className="locale-switcher">
      <summary aria-label="Language" title={getLocaleNativeLabel(current)}>
        {LOCALE_ICON}
      </summary>
      <nav className="locale-switcher-menu" aria-label="Language">
        {alternates.map((alternate) => (
          <Link
            key={alternate.locale}
            to={alternate.path}
            hrefLang={alternate.locale}
            aria-current={alternate.locale === current ? "true" : undefined}
          >
            {getLocaleNativeLabel(alternate.locale)}
          </Link>
        ))}
      </nav>
    </details>
  );
}

/**
 * 明暗切换：用站点自己的偏好而**不是**工作台的 `next-themes`——两者同源同一个 SPA，
 * 共用 `localStorage.theme` 会让访客的选择顺带改掉租户管理台的明暗。
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

/* -------------------------------------------------------------------------- */
/* 区域                                                                        */
/* -------------------------------------------------------------------------- */

export interface SiteChromeProps {
  section: SiteSection;
  siteName: string;
  logoUrl: string | null;
  pages?: PublicSitePage[];
  docs?: readonly PublicDocSummary[];
  hasDocs?: boolean;
  currentPath?: string;
  locale?: string;
  defaultLocale?: string;
  /** 本页各语言入口（语言块的候选）。 */
  alternates?: PageLocaleAlternate[];
  /** 编辑器里点击整块可选中；`blockId` 非空表示点在某个块上。 */
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

function chromeNavContext(props: SiteChromeProps): SiteNavContext {
  const defaultLocale = (props.defaultLocale ?? "zh-CN") as AppLocale;
  return {
    navPages: siteNavPages(props.pages ?? []),
    docs: props.docs,
    locale: (props.locale as AppLocale | undefined) ?? defaultLocale,
    defaultLocale,
    currentPath: props.currentPath ?? "",
  };
}

/**
 * 页头 / 页脚 —— **一个组件**。差别只有语义元素、吸顶、以及 `spacing_above`。
 * 与 SSR 的 `renderChromeHtml` 同构：同一批 class、同一套 DOM。
 */
export function SiteChrome({
  tag,
  ...props
}: SiteChromeProps & { tag: "header" | "footer" }): ReactElement {
  const { section, siteName, logoUrl, onSelect, alternates = [] } = props;
  const s = section.settings;
  const ctx = chromeNavContext(props);
  const select = selectable(onSelect);
  const shell = resolveChromeShell(
    tag === "header" ? "site-header" : "site-footer",
    s,
  );
  const className =
    tag === "header" && settingBool(s, "sticky")
      ? `${shell.className} sticky`
      : shell.className;
  const style = {
    ...surfaceStyleCss(resolveSurfaceStyle(s)),
    ...shell.vars,
    ...(tag === "footer"
      ? { "--chrome-mt": `${settingNumber(s, "spacing_above", 48)}px` }
      : {}),
    ...select.style,
  } as CSSProperties;

  const hasDocs = props.hasDocs ?? (props.docs?.length ?? 0) > 0;
  let mainNavUsed = false;

  function renderBlock(block: SiteBlock): ReactNode {
    switch (block.type) {
      case "chrome_brand": {
        const blurb = settingText(block.settings, "blurb");
        return (
          <div className="chrome-brand">
            <SiteLink href="/" className="brand">
              {settingBool(block.settings, "show_logo") && logoUrl ? (
                <img src={logoUrl} alt={siteName} className="logo" />
              ) : null}
              {settingBool(block.settings, "show_site_name") ? (
                <span>{siteName}</span>
              ) : null}
            </SiteLink>
            {blurb ? <p className="muted">{blurb}</p> : null}
          </div>
        );
      }
      case "chrome_nav": {
        const isMain = !mainNavUsed;
        mainNavUsed = true;
        return (
          <ChromeNav
            block={block}
            ctx={ctx}
            fallbackLabel={isMain ? mainNavLabel(ctx.locale) : undefined}
          />
        );
      }
      case "chrome_text": {
        const text = resolveChromeText(settingText(block.settings, "text"), {
          siteName,
        });
        return text ? <p className="chrome-text">{text}</p> : null;
      }
      case "chrome_button": {
        const label = settingText(block.settings, "label");
        const href = settingText(block.settings, "href");
        if (!label || !href) return null;
        const variant = settingText(block.settings, "variant") || "primary";
        return (
          <SiteLink
            href={href}
            className={
              variant === "ghost"
                ? "btn btn-ghost"
                : variant === "secondary"
                  ? "btn btn-secondary"
                  : "btn"
            }
          >
            {label}
          </SiteLink>
        );
      }
      case "chrome_search":
        return hasDocs ? <DocSearchForm ctx={ctx} /> : null;
      case "chrome_locale":
        return (
          <LocaleSwitcher alternates={alternates} current={props.locale ?? ""} />
        );
      case "chrome_theme":
        return <SiteThemeToggle locale={ctx.locale} />;
      case "chrome_account":
        return <MemberEntry />;
      default: {
        const View = getChromeBlockView(block.type);
        return View ? <View block={block} /> : null;
      }
    }
  }

  const Tag = tag;
  return (
    <Tag
      {...select}
      data-section-id={section.id}
      className={className}
      style={style}
    >
      {chromeRows(section.blocks).map((row) => (
        <div key={row.index} className={`wrap chrome-row chrome-row-${row.index}`}>
          {row.zones.map((zone) => (
            <div
              key={zone.align}
              className={`chrome-zone chrome-zone-${zone.align}`}
            >
              {zone.blocks.map((block) => {
                const inner = renderBlock(block);
                if (!inner) return null;
                const shellEl = (
                  <div
                    className={chromeBlockClass(block, "chrome-block")}
                    data-block-id={block.id}
                  >
                    {inner}
                  </div>
                );
                // 窄屏收进菜单的块多包一层；桌面上它是 `display: contents`，等于不存在
                return blockMobile(block) === "menu" ? (
                  <div key={block.id} className="chrome-drawer">
                    {shellEl}
                  </div>
                ) : (
                  <span key={block.id} style={{ display: "contents" }}>
                    {shellEl}
                  </span>
                );
              })}
            </div>
          ))}
          {row.hasMenu ? (
            <input
              type="checkbox"
              className="chrome-menu-toggle"
              aria-label={chromeMenuLabel(ctx.locale)}
            />
          ) : null}
        </div>
      ))}
    </Tag>
  );
}

/** 便利包装：区域本体的两种形态。渲染时**不许**再包一层同名元素（sticky 会失效）。 */
export function SiteHeader(props: SiteChromeProps): ReactElement {
  return <SiteChrome tag="header" {...props} />;
}

export function SiteFooter(props: SiteChromeProps): ReactElement {
  return <SiteChrome tag="footer" {...props} />;
}

export { chromeShellVarsAttr };
