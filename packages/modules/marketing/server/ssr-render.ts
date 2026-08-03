import { marked } from "marked";

import type {
  HomeBlocks,
  PublicMarketingPage,
  PublicMarketingSite,
  SiteLinkItem,
} from "../shared/site-cms.js";
import { escapeHtml } from "./site.util.js";

marked.setOptions({ gfm: true, breaks: false });

function renderLinks(items: SiteLinkItem[]): string {
  return items
    .map(
      (item) =>
        `<a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`,
    )
    .join("");
}

function renderHomeBlocks(blocks: HomeBlocks | null): string {
  if (!blocks) return "";
  const parts: string[] = [];
  if (blocks.hero) {
    parts.push(`<section class="hero">
  <h1>${escapeHtml(blocks.hero.headline)}</h1>
  ${blocks.hero.subhead ? `<p>${escapeHtml(blocks.hero.subhead)}</p>` : ""}
  ${
    blocks.hero.cta_label && blocks.hero.cta_href
      ? `<p><a class="cta" href="${escapeHtml(blocks.hero.cta_href)}">${escapeHtml(blocks.hero.cta_label)}</a></p>`
      : ""
  }
</section>`);
  }
  if (blocks.features?.length) {
    parts.push(`<section class="features">
  ${blocks.features
    .map(
      (f) => `<article>
    <h3>${escapeHtml(f.title)}</h3>
    <p>${escapeHtml(f.description)}</p>
  </article>`,
    )
    .join("\n")}
</section>`);
  }
  return parts.join("\n");
}

function accentStyle(color: string | null): string {
  if (!color) return "";
  return `--site-accent:${escapeHtml(color)};`;
}

export function renderMarketingHtml(input: {
  origin: string;
  site: PublicMarketingSite;
  page: PublicMarketingPage;
  spaEntrySrc?: string;
}): string {
  const { origin, site, page, spaEntrySrc } = input;
  const canonical = `${origin.replace(/\/$/u, "")}${page.path === "/" ? "/" : page.path}`;
  const bodyHtml = marked.parse(page.body_md || "", { async: false }) as string;
  const homeExtra =
    page.kind === "home" ? renderHomeBlocks(page.home_blocks) : "";
  const title = escapeHtml(
    page.kind === "home" ? site.site_name : `${page.title} · ${site.site_name}`,
  );
  const description = escapeHtml(page.description || site.tagline || "");
  const jsonLd = escapeHtml(
    JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description || site.tagline,
      url: canonical,
      isPartOf: {
        "@type": "WebSite",
        name: site.site_name,
        url: origin,
      },
    }),
  );

  return `<!DOCTYPE html>
<html lang="${escapeHtml(site.default_locale || "zh-CN")}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    :root { ${accentStyle(site.primary_color)} color-scheme: light; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; line-height: 1.6; color: #111; background: #fff; }
    a { color: var(--site-accent, #0f766e); }
    .wrap { max-width: 720px; margin: 0 auto; padding: 1.5rem; }
    header, footer { border-bottom: 1px solid #e5e5e5; }
    footer { border-bottom: 0; border-top: 1px solid #e5e5e5; margin-top: 3rem; }
    .brand { font-weight: 700; font-size: 1.125rem; text-decoration: none; color: inherit; }
    nav, .footer-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: .75rem; }
    .hero { margin: 2rem 0; }
    .hero h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 .75rem; }
    .cta { display: inline-block; margin-top: .5rem; padding: .5rem 1rem; border-radius: .5rem; background: var(--site-accent, #0f766e); color: #fff; text-decoration: none; }
    .features { display: grid; gap: 1rem; margin: 2rem 0; }
    .prose :is(h1,h2,h3) { line-height: 1.25; }
    .prose pre { overflow: auto; padding: 1rem; background: #f5f5f5; border-radius: .5rem; }
    .tagline { color: #525252; margin: .25rem 0 0; }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <a class="brand" href="/">${escapeHtml(site.site_name)}</a>
      ${site.tagline ? `<p class="tagline">${escapeHtml(site.tagline)}</p>` : ""}
      <nav>${renderLinks(site.nav)}</nav>
    </div>
  </header>
  <main class="wrap">
    ${homeExtra}
    ${page.kind !== "home" ? `<h1>${escapeHtml(page.title)}</h1>` : ""}
    <div class="prose">${bodyHtml}</div>
  </main>
  <footer>
    <div class="wrap">
      <div class="footer-nav">${renderLinks(site.footer)}</div>
      <p class="tagline">© ${escapeHtml(site.site_name)}</p>
    </div>
  </footer>
  ${spaEntrySrc ? `<script type="module" src="${escapeHtml(spaEntrySrc)}"></script>` : ""}
</body>
</html>`;
}

export function renderUnavailableHtml(input: {
  title: string;
  message: string;
}): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body>
  <main style="max-width:40rem;margin:4rem auto;padding:1.5rem;font-family:system-ui,sans-serif">
    <h1>${escapeHtml(input.title)}</h1>
    <p>${escapeHtml(input.message)}</p>
    <p><a href="/login">登录</a></p>
  </main>
</body>
</html>`;
}

export function renderSitemapXml(
  origin: string,
  paths: Array<{ path: string; updated_at?: string }>,
): string {
  const base = origin.replace(/\/$/u, "");
  const urls = paths
    .map((item) => {
      const loc = `${base}${item.path === "/" ? "/" : item.path}`;
      const lastmod = item.updated_at
        ? `<lastmod>${escapeHtml(item.updated_at.slice(0, 10))}</lastmod>`
        : "";
      return `<url><loc>${escapeHtml(loc)}</loc>${lastmod}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function renderRobotsTxt(origin: string): string {
  const base = origin.replace(/\/$/u, "");
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}
