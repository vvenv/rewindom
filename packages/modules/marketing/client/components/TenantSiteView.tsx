import { type CSSProperties } from "react";

import { cn } from "@be-water/ui/utils";

import {
  resolvePageSections,
  sectionsLeadWithHero,
  type SiteSection,
} from "../../shared/section-schema.js";
import {
  marketingPagePath,
  pageDepth,
  resolvePageNav,
  siblingPages,
  type MarketingPageSettings,
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../../shared/site-cms.js";
import {
  resolveThemeSettings,
  themeFontCss,
  themePageWidthCss,
} from "../../shared/theme-sections.js";

import { MarketingLayout } from "./MarketingLayout.js";
import { SiteFooter, SiteHeader } from "./sections/SiteChrome.js";
import { SiteSections } from "./sections/SiteSections.js";
import { SitePageNav } from "./SitePageNav.js";

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
  body_md?: string;
  sections?: SiteSection[];
  title?: string;
  description?: string;
  /** 页面级设置（同级页面菜单等）；未给时跟随站点主题 */
  pageSettings?: MarketingPageSettings;
  /** 编辑器预览时隐藏 MarketingLayout 外层（仍渲染页眉页脚） */
  embedded?: boolean;
  /** 编辑器覆盖：预览未保存的页头 / 页脚草稿 */
  headerOverride?: SiteSection;
  footerOverride?: SiteSection;
  onSelectSection?: (sectionId: string) => void;
}

/**
 * 绑定 Host 下 SPA 侧租户官网视图。
 * SEO 正文以 Fastify SSR 为准；此处在客户端导航时提供可读 UI。
 */
export function TenantSiteView({
  site,
  path,
  body_md = "",
  sections = [],
  title,
  description,
  pageSettings,
  embedded = false,
  headerOverride,
  footerOverride,
  onSelectSection,
}: TenantSiteViewProps) {
  const pageMeta = findPage(site, path);
  const pageTitle = title ?? pageMeta?.title ?? site.site_name;
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
  const hasOwnContent = sections.length > 0 || Boolean(body_md);
  // hero 开场的页面自带 h1，再渲染 page-head 就是标题出现两遍
  const showPageHead =
    path !== "/" &&
    pageMeta?.kind !== "home" &&
    !sectionsLeadWithHero(resolvePageSections({ sections, body_md }));
  // 嵌套页面（/docs/xxx 这类）配同级页面侧边菜单；顶层页各自独立，不挂侧栏
  // 位置按「页面设置 → 站点默认」取，页面没配（inherit）时跟随站点
  const navPosition = resolvePageNav(pageSettings, theme.page_nav);
  const showPageNav =
    navPosition !== "off" &&
    pageDepth(path) > 1 &&
    siblingPages(site.pages, path).items.length > 0;

  const navAside = (
    <aside className="pt-12 lg:sticky lg:top-20 lg:self-start">
      <SitePageNav pages={site.pages} currentPath={path} />
    </aside>
  );

  // section 自带限宽（`full` 才能通栏），所以 page-head 在没有侧栏时自己补一层
  const pageBody = (
    <>
      {showPageHead ? (
        <div
          className={cn(
            "space-y-3 pt-12",
            !showPageNav && `${WRAP} px-4 sm:px-6`,
          )}
        >
          <h1 className="text-3xl font-semibold tracking-tight">{pageTitle}</h1>
          {description || pageMeta?.description ? (
            <p className="text-muted-foreground">
              {description ?? pageMeta?.description}
            </p>
          ) : null}
        </div>
      ) : null}

      <SiteSections
        sections={sections}
        body_md={body_md}
        onSelectSection={onSelectSection}
        sectionSpacing={theme.section_spacing}
        contained={showPageNav}
      />
    </>
  );

  const content = (
    <div style={style} className="flex min-h-full flex-col">
      <SiteHeader
        section={header}
        siteName={site.site_name}
        logoUrl={theme.logo_url ?? null}
        onSelect={
          onSelectSection ? () => onSelectSection(header.id) : undefined
        }
      />

      {/* 限宽下放到各 section 内部（见 SiteSections），这里只做纵向流 */}
      <main className="flex-1">
        {!pageMeta && path !== "/" && !hasOwnContent ? (
          <div className={cn(WRAP, "space-y-2 px-4 py-16 sm:px-6")}>
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="text-muted-foreground">
              This page is not published on {site.site_name}.
            </p>
          </div>
        ) : showPageNav ? (
          <div className={cn(WRAP, "px-4 sm:px-6")}>
            <div
              className={cn(
                "grid gap-10 lg:gap-14",
                navPosition === "right"
                  ? "lg:grid-cols-[minmax(0,1fr)_13rem]"
                  : "lg:grid-cols-[13rem_minmax(0,1fr)]",
              )}
            >
              {/* 菜单在右侧时连 DOM 顺序一起换：读屏顺序与窄屏堆叠都跟着视觉走 */}
              {navPosition === "right" ? (
                <>
                  <div className="min-w-0">{pageBody}</div>
                  {navAside}
                </>
              ) : (
                <>
                  {navAside}
                  <div className="min-w-0">{pageBody}</div>
                </>
              )}
            </div>
          </div>
        ) : (
          pageBody
        )}
      </main>

      <SiteFooter
        section={footer}
        siteName={site.site_name}
        logoUrl={theme.logo_url ?? null}
        onSelect={
          onSelectSection ? () => onSelectSection(footer.id) : undefined
        }
      />
    </div>
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
  kind: "home" | "page" | "doc",
  slug: string,
): string {
  return marketingPagePath(kind, slug);
}

export type { PublicMarketingPage };
