import { type CSSProperties, type ReactNode } from "react";

import { cn } from "@be-water/ui/utils";

import {
  type PublicDocDetail,
  type PublicDocSummary,
} from "../../shared/marketing-doc.js";
import { MARKETING_SITE_ROOT_CLASS } from "../../shared/marketing-site-theme.js";
import {
  localizeSections,
  type SiteSection,
} from "../../shared/section-schema.js";
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
import { SiteSections, type SelectSectionFn } from "./sections/SiteSections.js";

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
  onSelectSection?: SelectSectionFn;
  /** 替换 main 区内容（会员门控占位等）；有值时不再渲染 sections。 */
  mainOverride?: ReactNode;
  /**
   * 文档库数据，供 `doc-*` 段渲染（编辑文档模板页时的预览）。
   * 与 SSR 的 `DocRenderContext` 同一组字段，见 `sections/render-context.ts`。
   */
  docs?: readonly PublicDocSummary[];
  /**
   * 页头 / 页脚看到的那份文档目录；不给就跟 `docs` 一样。
   *
   * 公开面只有一份文档数据，这里分成两个口子**只为编辑器**：一个文档都没有的站点，
   * 编辑文档模板页时 `docs` 会被换成一篇示例（否则版式预览是一片空白，见
   * `useDocPreviewData`），而那篇示例绝不能漏进页头——页头会因此长出一个线上不存在的
   * 「文档」下拉和一个搜不出东西的搜索框，正是这个组件该避免的那种谎。
   */
  chromeDocs?: readonly PublicDocSummary[];
  doc?: PublicDocDetail;
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
  docs,
  chromeDocs = docs,
  // `doc` 在这个组件里已经是那份 DOM Document 了，改个名避免撞车
  doc: docDetail,
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

  /*
   * 覆盖项来自编辑器草稿，仍是管理端形状（多语言文案是整张表）。公开读路径一律
   * 先压成当前语言，否则 `settingText` 拿到对象会渲染成空——页头主按钮就是典型。
   */
  const header = headerOverride
    ? localizeSections(headerOverride, site.locale, site.default_locale)
    : site.header;
  const footer = footerOverride
    ? localizeSections(footerOverride, site.locale, site.default_locale)
    : site.footer;
  const hasOwnContent = sections.length > 0;
  const content = (
    <SiteLocaleProvider
      locale={site.locale}
      defaultLocale={site.default_locale}
    >
      <div className="site-stack">
        {/*
          页头区**不能**再套一层 `<header>`：`SiteHeader` 自己就是 `<header>`，
          外面这层的高度恰好等于它，`position: sticky` 于是没有任何可粘的余量
          （sticky 只在包含块内部移动），「吸顶」开关点了跟没点一样。
          公开站 SSR 与编辑器预览都把页头直接摊在 `.site-stack` 下。页脚同理，
          顺带也消掉了嵌套 landmark。
        */}
        {header.map((section) =>
          section.type === "header" ? (
            <SiteHeader
              key={section.id}
              section={section}
              siteName={site.site_name}
              logoUrl={theme.logo_url ?? null}
              pages={site.pages}
              docs={chromeDocs}
              currentPath={path}
              alternates={alternates}
              locale={site.locale}
              defaultLocale={site.default_locale}
              onSelect={
                onSelectSection
                  ? (blockId) => onSelectSection(section.id, blockId)
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
              docs={docs}
              doc={docDetail}
            />
          ),
        )}

        <main className="site-main" style={mainStyle}>
          {mainOverride !== undefined ? (
            mainOverride
          ) : !pageMeta && path !== "/" && !hasOwnContent ? (
            <div className="wrap page-missing">
              <h1>Page not found</h1>
              <p className="muted">
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
              docs={docs}
              doc={docDetail}
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
              pages={site.pages}
              docs={chromeDocs}
              currentPath={path}
              alternates={alternates}
              locale={site.locale}
              defaultLocale={site.default_locale}
              onSelect={
                onSelectSection
                  ? (blockId) => onSelectSection(section.id, blockId)
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
              docs={docs}
              doc={docDetail}
            />
          ),
        )}
      </div>
    </SiteLocaleProvider>
  );

  const shellClass = cn(
    MARKETING_SITE_ROOT_CLASS,
    embedded && "is-embedded",
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
