import { type CSSProperties, type ReactNode } from "react";

import { cn } from "@be-water/ui/utils";

import { MARKETING_SITE_ROOT_CLASS } from "../../shared/marketing-site-theme.js";
import { type SiteSection } from "../../shared/section-schema.js";
import {
  marketingPagePath,
  type MarketingPageSettings,
  type PageLocaleAlternate,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import { resolveThemeSettings } from "../../shared/theme-sections.js";
import { useMarketingSiteDocumentTheme } from "../hooks/use-marketing-site-document-theme.js";
import { usePreviewDocument } from "../lib/preview-document-context.js";

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
  /** 编辑器预览时去掉外层 min-h-svh 壳（仍渲染页眉页脚） */
  embedded?: boolean;
  /** 编辑器覆盖：预览未保存的页头 / 页脚草稿 */
  headerOverride?: SiteSection[];
  footerOverride?: SiteSection[];
  onSelectSection?: (sectionId: string) => void;
  /** 替换 main 区内容（会员门控占位等）；有值时不再渲染 sections。 */
  mainOverride?: ReactNode;
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
  pageSettings,
  alternates = [],
  embedded = false,
  headerOverride,
  footerOverride,
  onSelectSection,
  mainOverride,
}: TenantSiteViewProps) {
  const previewDoc = usePreviewDocument();
  const doc = embedded ? previewDoc : document;
  useMarketingSiteDocumentTheme(site.theme_settings, doc);

  const pageMeta = findPage(site, path);
  const theme = resolveThemeSettings(site.theme_settings);
  const pageBg = pageSettings?.bg_color ?? null;
  const pageFg = pageSettings?.fg_color ?? null;
  const mainStyle: CSSProperties = {
    ...(pageBg ? { backgroundColor: pageBg } : {}),
    ...(pageFg ? { color: pageFg } : {}),
  };

  const header = headerOverride ?? site.header;
  const footer = footerOverride ?? site.footer;
  const hasOwnContent = sections.length > 0;
  const content = (
    <SiteLocaleProvider
      locale={site.locale}
      defaultLocale={site.default_locale}
    >
      <div className="flex min-h-full flex-col">
        {/*
          页头区**不能**再套一层 `<header>`：`SiteHeader` 自己就是 `<header>`，
          外面这层的高度恰好等于它，`position: sticky` 于是没有任何可粘的余量
          （sticky 只在包含块内部移动），「吸顶」开关点了跟没点一样。
          SSR 把页头直接摊在 `#root` 下，所以这条只在 SPA 接管后犯——首屏能吸，
          一水合就掉下来。页脚同理，顺带也消掉了嵌套 landmark。
        */}
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
              onSelect={
                onSelectSection ? () => onSelectSection(section.id) : undefined
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

        <main className="flex-1" style={mainStyle}>
          {mainOverride !== undefined ? (
            mainOverride
          ) : !pageMeta && path !== "/" && !hasOwnContent ? (
            <div className={cn(WRAP, "space-y-2 px-4 py-16 sm:px-6")}>
              <h1 className="text-2xl font-semibold">Page not found</h1>
              <p className="text-muted-foreground">
                This page is not published on {site.site_name}.
              </p>
            </div>
          ) : (
            <SiteSections
              sections={sections}
              onSelectSection={onSelectSection}
              sectionSpacing={theme.section_spacing}
              pages={site.pages}
              currentPath={path}
            />
          )}
        </main>

        {footer.map((section) =>
          section.type === "footer" ? (
            <SiteFooter
              key={section.id}
              section={section}
              siteName={site.site_name}
              logoUrl={theme.logo_url ?? null}
              onSelect={
                onSelectSection ? () => onSelectSection(section.id) : undefined
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
      </div>
    </SiteLocaleProvider>
  );

  const shellClass = cn(
    MARKETING_SITE_ROOT_CLASS,
    embedded ? "min-h-full" : "min-h-svh",
  );

  return <div className={shellClass}>{content}</div>;
}

/** 公开目录不含正文时，用 path 反查 slug/kind（仅元数据）。 */
export function resolvePublicPagePath(
  kind: "home" | "page",
  slug: string,
): string {
  return marketingPagePath(kind, slug);
}

export type { PublicMarketingPage };
