import { marked } from "marked";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
  SiteLinkItem,
} from "../shared/site-cms.js";
import {
  resolvePageSections,
  resolveThemeSettings,
  themeFontCss,
  type SiteSection,
} from "../shared/theme-sections.js";
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

function renderMarkdown(body_md: string): string {
  return marked.parse(body_md || "", { async: false }) as string;
}

function primaryLinkHtml(
  label: string | undefined,
  href: string | undefined,
): string {
  if (!label || !href) return "";
  return `<p><a class="btn" href="${escapeHtml(href)}">${escapeHtml(label)}</a></p>`;
}

function cardsColumnsClass(columns: 2 | 3 | 4): string {
  return `cards cols-${columns}`;
}

function renderSection(section: SiteSection): string {
  switch (section.type) {
    case "hero": {
      const s = section.settings;
      return `<section class="hero">
  <h1>${escapeHtml(s.headline)}</h1>
  ${s.subhead ? `<p>${escapeHtml(s.subhead)}</p>` : ""}
  ${primaryLinkHtml(s.primary_label, s.primary_href)}
</section>`;
    }
    case "prose":
      return `<section class="prose">${renderMarkdown(section.settings.body_md)}</section>`;
    case "cards": {
      const { columns, items } = section.settings;
      if (!items.length) return "";
      return `<section class="${cardsColumnsClass(columns)}">
  ${items
    .map((item) => {
      const body = item.body
        ? `<p>${escapeHtml(item.body)}</p>`
        : "";
      const title = `<h3>${escapeHtml(item.title)}</h3>`;
      if (item.href) {
        return `<a class="card" href="${escapeHtml(item.href)}">${title}${body}</a>`;
      }
      return `<article class="card">${title}${body}</article>`;
    })
    .join("\n")}
</section>`;
    }
    case "split": {
      const s = section.settings;
      return `<section class="split">
  <div>
    <h2>${escapeHtml(s.title)}</h2>
    ${s.body ? `<p>${escapeHtml(s.body)}</p>` : ""}
    ${primaryLinkHtml(s.primary_label, s.primary_href)}
  </div>
  <div class="prose">${renderMarkdown(s.aside_md ?? "")}</div>
</section>`;
    }
    case "band": {
      const s = section.settings;
      return `<section class="band">
  <h2>${escapeHtml(s.headline)}</h2>
  ${s.body ? `<p>${escapeHtml(s.body)}</p>` : ""}
  ${primaryLinkHtml(s.primary_label, s.primary_href)}
</section>`;
    }
  }
}

function accentStyle(color: string | null | undefined): string {
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
  const theme = resolveThemeSettings({
    theme_settings: site.theme_settings,
    logo_url: site.logo_url,
    primary_color: site.primary_color,
  });
  const sections = resolvePageSections({
    sections: page.sections,
    body_md: page.body_md,
  });
  const sectionsHtml = sections.map(renderSection).join("\n");
  const canonical = `${origin.replace(/\/$/u, "")}${page.path === "/" ? "/" : page.path}`;
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
  const logoHtml =
    theme.logo_url != null && theme.logo_url !== ""
      ? `<img class="logo" src="${escapeHtml(theme.logo_url)}" alt="${escapeHtml(site.site_name)}" />`
      : "";

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
    :root { ${accentStyle(theme.primary_color)} color-scheme: light; }
    body { margin: 0; font-family: ${themeFontCss(theme.font_family)}; line-height: 1.6; color: #111; background: #fff; }
    a { color: var(--site-accent, #0f766e); }
    .wrap { max-width: 720px; margin: 0 auto; padding: 1.5rem; }
    header, footer { border-bottom: 1px solid #e5e5e5; }
    footer { border-bottom: 0; border-top: 1px solid #e5e5e5; margin-top: 3rem; }
    .brand-row { display: flex; align-items: center; gap: .75rem; }
    .logo { height: 2rem; width: auto; }
    .brand { font-weight: 700; font-size: 1.125rem; text-decoration: none; color: inherit; }
    nav, .footer-nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: .75rem; }
    .hero { margin: 2rem 0; }
    .hero h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 .75rem; }
    .btn { display: inline-block; margin-top: .5rem; padding: .5rem 1rem; border-radius: .5rem; background: var(--site-accent, #0f766e); color: #fff; text-decoration: none; }
    .band { margin: 2rem 0; padding: 1.5rem; border: 1px solid #e5e5e5; border-radius: .75rem; }
    .cards { display: grid; gap: 1rem; margin: 2rem 0; }
    .cards.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cards.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .cards.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .card { display: block; border: 1px solid #e5e5e5; border-radius: .5rem; padding: 1rem; color: inherit; text-decoration: none; }
    .split { display: grid; gap: 1.5rem; margin: 2rem 0; grid-template-columns: 1fr 1fr; }
    .prose :is(h1,h2,h3) { line-height: 1.25; }
    .prose pre { overflow: auto; padding: 1rem; background: #f5f5f5; border-radius: .5rem; }
    .tagline { color: #525252; margin: .25rem 0 0; }
    @media (max-width: 640px) {
      .cards.cols-2, .cards.cols-3, .cards.cols-4, .split { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <div class="brand-row">
        ${logoHtml}
        <a class="brand" href="/">${escapeHtml(site.site_name)}</a>
      </div>
      ${site.tagline ? `<p class="tagline">${escapeHtml(site.tagline)}</p>` : ""}
      <nav>${renderLinks(site.nav)}</nav>
    </div>
  </header>
  <main class="wrap">
    ${page.kind !== "home" ? `<h1>${escapeHtml(page.title)}</h1>` : ""}
    ${sectionsHtml}
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
