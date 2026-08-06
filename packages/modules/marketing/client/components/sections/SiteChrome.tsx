import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useRef,
} from "react";

import { getLocaleNativeLabel } from "@be-water/shared";
import { Link } from "react-router";

import {
  resolveSurfaceStyle,
  settingBool,
  settingText,
  surfaceStyleCss,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import {
  siteNavPages,
  type PageLocaleAlternate,
  type PublicSitePage,
} from "../../../shared/site-cms.js";
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
 * 会员入口由 site-member 通过 slot 填入；未开通会员的站点这里什么都不渲染。
 *
 * 平台预渲染与主题编辑器都拿不到 `publicProviders`（slot 为空）：前者本就不该
 * 输出一个随后又被 SPA 抹掉的登录按钮，后者由编辑器自己灌一个静态预览进来。
 */
function SiteMemberEntry(): ReactElement | null {
  const Entry = siteMemberEntrySlot.useSlot();
  return Entry ? <Entry /> : null;
}

/** 页脚 blocks 按 `group` 聚成列；无 group 的归到一个匿名列。 */
function groupFooterLinks(
  blocks: SiteBlock[],
): Array<{ group: string; links: SiteBlock[] }> {
  const groups: Array<{ group: string; links: SiteBlock[] }> = [];
  for (const block of blocks) {
    const group = settingText(block.settings, "group").trim();
    const existing = groups.find((item) => item.group === group);
    if (existing) {
      existing.links.push(block);
    } else {
      groups.push({ group, links: [block] });
    }
  }
  return groups;
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
function SiteThemeToggle(): ReactElement {
  const { mode, resolved, setMode } = useSiteColorMode();
  const label =
    mode === "system" ? "跟随系统" : mode === "dark" ? "深色" : "浅色";

  return (
    <button
      type="button"
      className="theme-toggle"
      title={`当前主题: ${label}`}
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
  /** 编辑器里点击整块可选中 */
  onSelect?: () => void;
}

function selectable(onSelect: (() => void) | undefined) {
  if (!onSelect) return {};
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelect();
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect();
      }
    },
    style: { cursor: "pointer" } as CSSProperties,
  };
}

/** 页头导航链接：全站一级页 + 自定义 `nav_link` 块。 */
function headerNavLinks(
  section: SiteSection,
  pages: PublicSitePage[],
): Array<{ key: string; href: string; label: string }> {
  const links: Array<{ key: string; href: string; label: string }> = [];
  if (settingBool(section.settings, "show_site_nav")) {
    for (const page of siteNavPages(pages)) {
      links.push({
        key: `page:${page.path}`,
        href: page.path,
        label: page.title,
      });
    }
  }
  for (const block of section.blocks) {
    links.push({
      key: block.id,
      href: settingText(block.settings, "href"),
      label: settingText(block.settings, "label"),
    });
  }
  return links;
}

export function SiteHeader({
  section,
  siteName,
  logoUrl,
  onSelect,
  pages = [],
  currentPath,
  alternates = [],
  locale,
}: ChromeProps & {
  /** 全站导航（一级页）的数据源；未传时开关打开也不渲染自动条目。 */
  pages?: PublicSitePage[];
  /** 当前逻辑路径，用于 `aria-current`。 */
  currentPath?: string;
  /** 本页各语言入口（语言切换器的候选）。 */
  alternates?: PageLocaleAlternate[];
  locale?: string;
}): ReactElement {
  const s = section.settings;
  const secondaryLabel = settingText(s, "secondary_label");
  const secondaryHref = settingText(s, "secondary_href");
  const ctaLabel = settingText(s, "primary_label");
  const ctaHref = settingText(s, "primary_href");
  const layout = settingText(s, "layout") || "split";
  const centered = layout === "centered";
  const select = selectable(onSelect);
  const navLinks = headerNavLinks(section, pages);
  const surface = resolveSurfaceStyle(s);
  const surfaceCss = {
    ...surfaceStyleCss(surface),
    ...select.style,
  } as CSSProperties;

  const headerClass = [
    "site-header",
    settingBool(s, "sticky") ? "sticky" : "",
  ]
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
          {navLinks.map((link) => (
            <SiteLink
              key={link.key}
              href={link.href}
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </SiteLink>
          ))}
        </nav>

        <div className="header-actions">
          {settingBool(s, "show_locale_switcher") ? (
            <LocaleSwitcher alternates={alternates} current={locale ?? ""} />
          ) : null}
          {/*
            明暗默认跟随设备；这枚按钮只是让访客手动改，关掉不等于锁死浅色。
          */}
          {settingBool(s, "show_theme_toggle") ? <SiteThemeToggle /> : null}
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

      {navLinks.length > 0 ? (
        <nav className="header-mobile-nav wrap">
          {navLinks.map((link) => (
            <SiteLink
              key={link.key}
              href={link.href}
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </SiteLink>
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
}: ChromeProps): ReactElement {
  const s = section.settings;
  const blurb = settingText(s, "blurb");
  const copyright =
    settingText(s, "copyright") || `© ${new Date().getFullYear()} ${siteName}`;
  const groups = groupFooterLinks(section.blocks);
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

        {groups.map((group, index) => (
          <nav key={group.group || `group-${index}`}>
            {group.group ? <h2>{group.group}</h2> : null}
            <ul>
              {group.links.map((block) => (
                <li key={block.id}>
                  <SiteLink href={settingText(block.settings, "href")}>
                    {settingText(block.settings, "label")}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="wrap footer-legal">{copyright}</div>
    </footer>
  );
}
