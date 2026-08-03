import { Button } from "@be-water/ui/button";
import { type CSSProperties } from "react";
import { Link } from "react-router";

import { marketingPagePath } from "../../shared/site-cms.js";
import {
  resolveThemeSettings,
  themeFontCss,
  type SiteSection,
} from "../../shared/theme-sections.js";
import {
  MarketingLayout,
  MarketingSection,
} from "./MarketingLayout.js";
import { SiteSections } from "./sections/SiteSections.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../../shared/site-cms.js";

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
  /** 编辑器预览时隐藏 MarketingLayout 外层（仍渲染页眉页脚） */
  embedded?: boolean;
  selectedSectionId?: string | null;
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
  embedded = false,
  selectedSectionId = null,
  onSelectSection,
}: TenantSiteViewProps) {
  const pageMeta = findPage(site, path);
  const pageTitle = title ?? pageMeta?.title ?? site.site_name;
  const theme = resolveThemeSettings({
    theme_settings: site.theme_settings,
    logo_url: site.logo_url,
    primary_color: site.primary_color,
  });
  const accent = theme.primary_color ?? undefined;
  const style: CSSProperties = {
    ["--site-accent" as string]: accent,
    fontFamily: themeFontCss(theme.font_family),
    ...(accent
      ? {
          ["--primary" as string]: accent,
          ["--color-primary" as string]: accent,
          ["--ring" as string]: accent,
        }
      : {}),
  };

  const content = (
    <div
      style={style}
      className={accent ? "[&_a:not([class*='bg-'])]:text-[var(--site-accent)]" : undefined}
    >
      <header className="border-b">
        <MarketingSection className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {theme.logo_url ? (
              <img
                src={theme.logo_url}
                alt={site.site_name}
                className="h-8 w-auto"
              />
            ) : null}
            <div>
              <Link
                to="/"
                className="text-lg font-semibold"
                style={{ color: "inherit" }}
              >
                {site.site_name}
              </Link>
              {site.tagline ? (
                <p className="text-sm text-muted-foreground">{site.tagline}</p>
              ) : null}
            </div>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            {site.nav.map((item) => (
              <Link key={`${item.label}-${item.href}`} to={item.href}>
                {item.label}
              </Link>
            ))}
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Login</Link>
            </Button>
          </nav>
        </MarketingSection>
      </header>

      <MarketingSection className="py-10">
        {!pageMeta && path !== "/" && sections.length === 0 && !body_md ? (
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="text-muted-foreground">
              This page is not published on {site.site_name}.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {path !== "/" && pageMeta?.kind !== "home" ? (
              <h1 className="text-3xl font-semibold tracking-tight">
                {pageTitle}
              </h1>
            ) : null}

            {description || pageMeta?.description ? (
              <p className="text-muted-foreground">
                {description ?? pageMeta?.description}
              </p>
            ) : null}

            <SiteSections
              sections={sections}
              body_md={body_md}
              selectedSectionId={selectedSectionId}
              onSelectSection={onSelectSection}
            />

            {path === "/docs" || path.startsWith("/docs/") ? (
              <ul className="space-y-2 border-t pt-6">
                {site.pages
                  .filter((p) => p.kind === "doc")
                  .map((p) => (
                    <li key={p.path}>
                      <Link className="text-primary" to={p.path}>
                        {p.title}
                      </Link>
                      {p.description ? (
                        <p className="text-sm text-muted-foreground">
                          {p.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        )}
      </MarketingSection>

      <footer className="mt-12 border-t">
        <MarketingSection className="flex flex-wrap gap-3 py-6 text-sm text-muted-foreground">
          {site.footer.map((item) => (
            <Link key={`${item.label}-${item.href}`} to={item.href}>
              {item.label}
            </Link>
          ))}
          <span>© {site.site_name}</span>
        </MarketingSection>
      </footer>
    </div>
  );

  if (embedded) {
    return content;
  }

  return <MarketingLayout path={path}>{content}</MarketingLayout>;
}

/** 公开目录不含正文时，用 path 反查 slug/kind（仅元数据）。 */
export function resolvePublicPagePath(
  kind: "home" | "page" | "doc",
  slug: string,
): string {
  return marketingPagePath(kind, slug);
}

export type { PublicMarketingPage };
