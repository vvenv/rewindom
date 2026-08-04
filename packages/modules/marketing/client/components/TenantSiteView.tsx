import { type CSSProperties } from "react";

import { cn } from "@be-water/ui/utils";

import { type SiteSection } from "../../shared/section-schema.js";
import {
  marketingPagePath,
  type MarketingPageSettings,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import {
  resolveThemeSettings,
  themeFontCss,
  themePageWidthCss,
} from "../../shared/theme-sections.js";

import { MarketingLayout } from "./MarketingLayout.js";
import { SiteLocaleProvider } from "./sections/site-locale-context.js";
import { SiteFooter, SiteHeader } from "./sections/SiteChrome.js";
import { SiteSections } from "./sections/SiteSections.js";

/** 页面外壳的限宽（与页头页脚、section 的 `wide` 一致）。 */
const WRAP = "mx-auto w-full max-w-[var(--site-page-width,72rem)]";

function findPage(
  site: PublicMarketingSite,
  path: string,
): PublicMarketingSite["pages"][number] | undefined {
  const normalized =
    path === "/" || path === ""
      ? "/"
      : path.endsWith("/") && path.length > 1
        ? path.slice(0, -1)
        : path;
  return site.pages.find((p) => p.path === normalized);
}

interface TenantSiteViewProps {
  site: PublicMarketingSite;
  path: string;
  sections?: SiteSection[];
  /** 页面级设置；未给时跟随站点主题 */
  pageSettings?: MarketingPageSettings;
  /** 本页各语言入口；驱动页头的语言切换器 */
  alternates?: PageLocaleAlternate[];
  /** 编辑器预览时隐藏 MarketingLayout 外层（仍渲染页眉页脚） */
  embedded?: boolean;
  /** 编辑器覆盖：预览未保存的页头 / 页脚草稿 */
  headerOverride?: SiteSection[];
  footerOverride?: SiteSection[];
  onSelectSection?: (sectionId: string) => void;
}

/**
 * 绑定 Host 下 SPA 侧租户官网视图。
 * SEO 正文以 Fastify SSR 为准；此处在客户端导航时提供可读 UI。
 *
 * 动态页面菜单用 `page-menu` section（children / siblings）；
 * 顶栏全站导航由 header 的 `show_site_nav` 列出一级页。
 */
export function TenantSiteView({
  site,
  path,
  sections = [],
  alternates = [],
  embedded = false,
  headerOverride,
  footerOverride,
  onSelectSection,
}: TenantSiteViewProps) {
  const pageMeta = findPage(site, path);
  const theme = resolveThemeSettings(site.theme_settings);
  const accent = theme.primary_color ?? undefined;
  const style: CSSProperties = {
    ["--site-accent" as string]: accent,
    ["--site-page-width" as string]: themePageWidthCss(theme.page_width),
    fontFamily: themeFontCss(theme.font_family),
    ...(accent
      ? {
          ["--primary" as string]: accent,
          ["--color-primary" as string]: accent,
          ["--ring" as string]: accent,
        }
      : {}),
  };

  const header = headerOverride ?? site.header;
  const footer = footerOverride ?? site.footer;
  const hasOwnContent = sections.length > 0;
  const content = (
    <SiteLocaleProvider
      locale={site.locale}
      defaultLocale={site.default_locale}
    >
      <div style={style} className="flex min-h-full flex-col">
        {/*
          页头区是**一串** section：导航条本体走 SiteHeader，公告条之类的普通段
          走通用渲染。页脚同理。
        */}
        <header>
          {header.map((section) =>
            section.type === "header" ? (
              <SiteHeader
                key={section.id}
                section={section}
                siteName={site.site_name}
                logoUrl={theme.logo_url ?? null}
                pages={site.pages}
                currentPath={path}
                alternates={alternates}
                locale={site.locale}
                showLocaleSwitcher={theme.show_locale_switcher === true}
                onSelect={
                  onSelectSection
                    ? () => onSelectSection(section.id)
                    : undefined
                }
              />
            ) : (
              <SiteSections
                key={section.id}
                sections={[section]}
                onSelectSection={onSelectSection}
                sectionSpacing={theme.section_spacing}
                pages={site.pages}
                currentPath={path}
              />
            ),
          )}
        </header>

        <main className="flex-1">
          {!pageMeta && path !== "/" && !hasOwnContent ? (
            <div className={cn(WRAP, "space-y-2 px-4 py-16 sm:px-6")}>
              <h1 className="text-2xl font-semibold">Page not found</h1>
              <p className="text-muted-foreground">
                This page is not published on {site.site_name}.
              </p>
            </div>
          ) : (
            <>
              <SiteSections
                sections={sections}
                onSelectSection={onSelectSection}
                sectionSpacing={theme.section_spacing}
                pages={site.pages}
                currentPath={path}
              />
            </>
          )}
        </main>

        <footer>
          {footer.map((section) =>
            section.type === "footer" ? (
              <SiteFooter
                key={section.id}
                section={section}
                siteName={site.site_name}
                logoUrl={theme.logo_url ?? null}
                onSelect={
                  onSelectSection
                    ? () => onSelectSection(section.id)
                    : undefined
                }
              />
            ) : (
              <SiteSections
                key={section.id}
                sections={[section]}
                onSelectSection={onSelectSection}
                sectionSpacing={theme.section_spacing}
                pages={site.pages}
                currentPath={path}
              />
            ),
          )}
        </footer>
      </div>
    </SiteLocaleProvider>
  );

  if (embedded) {
    // 与 MarketingLayout(chrome=false) 同一层底色，避免 iframe 直接露 body 渐变
    // 而实站被 `bg-background` 壳盖住——预览会和真实页面不一致
    return (
      <div className="min-h-full bg-background text-foreground">{content}</div>
    );
  }

  // 租户官网用自己的页头页脚，不套平台 chrome（只借 locale 同步与 SEO）
  return (
    <MarketingLayout path={path} chrome={false}>
      {content}
    </MarketingLayout>
  );
}

/** 公开目录不含正文时，用 path 反查 slug/kind（仅元数据）。 */
export function resolvePublicPagePath(
  kind: "home" | "page",
  slug: string,
): string {
  return marketingPagePath(kind, slug);
}

export type { PublicMarketingPage };
