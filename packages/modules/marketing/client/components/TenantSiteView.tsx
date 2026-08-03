import { Button } from "@be-water/ui/button";
import { marked } from "marked";
import { useMemo } from "react";
import { Link } from "react-router";

import { marketingPagePath } from "../../shared/site-cms.js";
import {
  MarketingLayout,
  MarketingSection,
} from "./MarketingLayout.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../../shared/site-cms.js";

marked.setOptions({ gfm: true, breaks: false });

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
  /** 详情正文：公开目录接口不含 body，需调用方传入或留空仅展示目录信息 */
  body_md?: string;
  home_blocks?: PublicMarketingPage["home_blocks"];
  title?: string;
  description?: string;
}

/**
 * 绑定 Host 下 SPA 侧租户官网视图。
 * SEO 正文以 Fastify SSR 为准；此处在客户端导航时提供可读 UI。
 */
export function TenantSiteView({
  site,
  path,
  body_md = "",
  home_blocks = null,
  title,
  description,
}: TenantSiteViewProps) {
  const pageMeta = findPage(site, path);
  const html = useMemo(
    () => marked.parse(body_md || "", { async: false }) as string,
    [body_md],
  );
  const pageTitle = title ?? pageMeta?.title ?? site.site_name;

  return (
    <MarketingLayout path={path}>
      <header className="border-b">
        <MarketingSection className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link to="/" className="text-lg font-semibold">
              {site.site_name}
            </Link>
            {site.tagline ? (
              <p className="text-sm text-muted-foreground">{site.tagline}</p>
            ) : null}
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
        {!pageMeta && path !== "/" ? (
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Page not found</h1>
            <p className="text-muted-foreground">
              This page is not published on {site.site_name}.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {home_blocks?.hero ? (
              <section className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight">
                  {home_blocks.hero.headline}
                </h1>
                {home_blocks.hero.subhead ? (
                  <p className="text-lg text-muted-foreground">
                    {home_blocks.hero.subhead}
                  </p>
                ) : null}
                {home_blocks.hero.cta_label && home_blocks.hero.cta_href ? (
                  <Button asChild>
                    <Link to={home_blocks.hero.cta_href}>
                      {home_blocks.hero.cta_label}
                    </Link>
                  </Button>
                ) : null}
              </section>
            ) : path !== "/" ? (
              <h1 className="text-3xl font-semibold tracking-tight">
                {pageTitle}
              </h1>
            ) : null}

            {description || pageMeta?.description ? (
              <p className="text-muted-foreground">
                {description ?? pageMeta?.description}
              </p>
            ) : null}

            {home_blocks?.features?.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {home_blocks.features.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-lg border p-4"
                  >
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            {html ? (
              <div
                className="prose prose-neutral dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : null}

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
