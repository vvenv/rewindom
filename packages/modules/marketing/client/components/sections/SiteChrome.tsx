import { type ReactElement } from "react";

import { getLocaleNativeLabel } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@be-water/ui/dropdown-menu";
import { cn } from "@be-water/ui/utils";
import { Check, Languages } from "lucide-react";
import { Link } from "react-router";

import {
  settingBool,
  settingText,
  type SiteBlock,
  type SiteSection,
} from "../../../shared/section-schema.js";
import {
  siteNavPages,
  type PageLocaleAlternate,
  type PublicSitePage,
} from "../../../shared/site-cms.js";

import { SiteLink } from "./SiteLink.js";

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
 * 语言切换：icon + dropdown，**不**按 `Accept-Language` 自动跳转。
 *
 * 自动跳转会让爬虫只看到一种语言，各语言页面互相收录不到（Shopify 同样只做显式切换）。
 * 候选来自本页 `alternates`——只列真的有已发布译文的语言，点进去不会是 404。
 * 目标路径已带 locale 前缀，所以直接用 `Link` 而不是会再改写一次的 `SiteLink`。
 * UI 与 `@be-water/client-kit` 的 `LocaleToggle` 对齐（Languages icon + 菜单）。
 */
function LocaleSwitcher({
  alternates,
  current,
}: {
  alternates: PageLocaleAlternate[];
  current: string;
}): ReactElement | null {
  if (alternates.length < 2) return null;
  const currentLabel = getLocaleNativeLabel(current);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-lg"
          aria-label="Language"
          title={currentLabel}
        >
          <Languages className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={8} className="w-max">
        {alternates.map((alternate) => {
          const active = alternate.locale === current;
          return (
            <DropdownMenuItem key={alternate.locale} asChild>
              <Link
                to={alternate.path}
                hrefLang={alternate.locale}
                aria-current={active ? "true" : undefined}
              >
                <span className="flex-1">{getLocaleNativeLabel(alternate.locale)}</span>
                {active ? <Check className="size-4 opacity-70" /> : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
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
    className: "cursor-pointer",
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
  showLocaleSwitcher = false,
}: ChromeProps & {
  /** 全站导航（一级页）的数据源；未传时开关打开也不渲染自动条目。 */
  pages?: PublicSitePage[];
  /** 当前逻辑路径，用于 `aria-current`。 */
  currentPath?: string;
  /** 本页各语言入口（语言切换器的候选）。 */
  alternates?: PageLocaleAlternate[];
  locale?: string;
  /** 站点级开关（`theme_settings.show_locale_switcher`）。 */
  showLocaleSwitcher?: boolean;
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

  return (
    <header
      {...select}
      data-section-id={section.id}
      className={cn(
        "z-40 border-b border-border/60 bg-background/85 backdrop-blur-md",
        settingBool(s, "sticky") && "sticky top-0",
        select.className,
      )}
    >
      <div
        className={cn(
          "mx-auto w-full max-w-[var(--site-page-width,72rem)] px-4 sm:px-6",
          centered
            ? "grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4"
            : "flex h-14 items-center gap-2 sm:gap-4",
        )}
      >
        <SiteLink
          href="/"
          className={cn(
            "flex items-center gap-2 text-foreground transition-opacity hover:opacity-80",
            centered && "justify-self-start",
          )}
        >
          {settingBool(s, "show_logo") && logoUrl ? (
            <img src={logoUrl} alt={siteName} className="h-6 w-auto" />
          ) : null}
          {settingBool(s, "show_site_name") ? (
            <span className="font-semibold">{siteName}</span>
          ) : null}
        </SiteLink>

        <nav
          className={cn(
            "hidden items-center gap-1 md:flex",
            centered ? "justify-self-center" : "ml-2",
          )}
        >
          {navLinks.map((link) => (
            <SiteLink
              key={link.key}
              href={link.href}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-muted/60 hover:text-foreground",
                currentPath === link.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </SiteLink>
          ))}
        </nav>

        <div
          className={cn(
            "flex items-center gap-1.5",
            centered ? "justify-self-end" : "ml-auto",
          )}
        >
          {showLocaleSwitcher ? (
            <LocaleSwitcher alternates={alternates} current={locale ?? ""} />
          ) : null}
          {secondaryLabel && secondaryHref ? (
            <Button asChild variant="ghost" size="sm" className="px-3">
              <SiteLink href={secondaryHref}>{secondaryLabel}</SiteLink>
            </Button>
          ) : null}
          {ctaLabel && ctaHref ? (
            <Button asChild size="sm" className="px-3 sm:px-4">
              <SiteLink href={ctaHref}>{ctaLabel}</SiteLink>
            </Button>
          ) : null}
        </div>
      </div>

      {navLinks.length > 0 ? (
        <nav className="flex flex-wrap gap-3 border-t border-border/60 px-4 py-2 text-sm md:hidden">
          {navLinks.map((link) => (
            <SiteLink
              key={link.key}
              href={link.href}
              className={cn(
                currentPath === link.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
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

  return (
    <footer
      {...select}
      data-section-id={section.id}
      className={cn(
        "mt-12 border-t border-border/60 bg-muted/20",
        select.className,
      )}
    >
      <div className="mx-auto grid w-full max-w-[var(--site-page-width,72rem)] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {settingBool(s, "show_logo") && logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-6 w-auto" />
            ) : null}
            <span className="font-medium">{siteName}</span>
          </div>
          {blurb ? (
            <p className="max-w-xs text-sm text-muted-foreground">{blurb}</p>
          ) : null}
        </div>

        {groups.map((group, index) => (
          <nav key={group.group || `group-${index}`} className="space-y-3">
            {group.group ? (
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {group.group}
              </h2>
            ) : null}
            <ul className="space-y-2 text-sm">
              {group.links.map((block) => (
                <li key={block.id}>
                  <SiteLink
                    href={settingText(block.settings, "href")}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {settingText(block.settings, "label")}
                  </SiteLink>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto w-full max-w-[var(--site-page-width,72rem)] border-t border-border/60 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        {copyright}
      </div>
    </footer>
  );
}
