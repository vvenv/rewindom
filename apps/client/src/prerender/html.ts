/**
 * 预渲染的 HTML 拼装：纯字符串处理，与文件系统和 React 无关，因此可以单测。
 *
 * `scripts/prerender.mjs` 只负责 IO 与编排，判断逻辑都在这里。
 */
import {
  SITE,
  buildCanonicalUrl,
  buildDocumentTitle,
  normalizeOrigin,
  type PageSeo,
} from "@be-water/modules/marketing/shared/index.js";
import { DEFAULT_LOCALE, type AppLocale } from "@be-water/shared";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&#39;");
}

/**
 * JSON-LD 内联进 `<script>`：只需要防止提前闭合标签。
 * 不能用 `escapeHtml`——那会把引号变成实体，JSON 就废了。
 */
export function serialiseJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</gu, "\\u003c");
}

/** Open Graph locale 标签（下划线形式）。 */
export function ogLocaleFor(locale: AppLocale | undefined): string {
  return (locale ?? DEFAULT_LOCALE) === "en" ? "en_US" : "zh_CN";
}

/** 这一页的 `<head>` 内容（不含 `<head>` 标签本身）。 */
export function buildHead(seo: PageSeo, origin: string): string {
  const title = buildDocumentTitle(seo);
  const canonicalPath = seo.canonical_path ?? seo.path;
  const canonical = buildCanonicalUrl(origin, canonicalPath);
  const ogLocale = ogLocaleFor(seo.locale);
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE.name)}" />`,
    `<meta property="og:locale" content="${escapeHtml(ogLocale)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    // 没有 OG 图资源，用 summary 而不是 summary_large_image——后者缺图会退化成裸链接
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
  ];

  const jsonLd = seo.buildJsonLd?.(origin);
  if (jsonLd) {
    tags.push(
      `<script type="application/ld+json">${serialiseJsonLd(jsonLd)}</script>`,
    );
  }

  return tags.map((tag) => `    ${tag}`).join("\n");
}

/**
 * 把 head 与正文塞进 vite 产出的 index.html。
 *
 * 模板里的 `<title>` 与占位 description 会被移除——留着就是两个 title 标签，
 * 搜索引擎取哪个都不受控。找不到锚点直接抛错：静默产出没有 SEO 头的页面更糟。
 */
export function injectPrerenderedPage({
  template,
  head,
  body,
  locale = DEFAULT_LOCALE,
}: {
  template: string;
  head: string;
  body: string;
  locale?: AppLocale;
}): string {
  if (!template.includes("</head>")) {
    throw new Error("index.html 模板里找不到 </head>");
  }
  if (!/<div id="root">\s*<\/div>/u.test(template)) {
    throw new Error('index.html 模板里找不到空的 <div id="root"></div>');
  }

  return template
    .replace(/<html\b[^>]*>/u, `<html lang="${locale}">`)
    .replace(/[ \t]*<title>[\s\S]*?<\/title>\r?\n?/u, "")
    .replace(/[ \t]*<meta\s+name="description"[^>]*>\r?\n?/giu, "")
    .replace("</head>", `${head}\n  </head>`)
    .replace(/<div id="root">\s*<\/div>/u, `<div id="root">${body}</div>`);
}

/** 路由路径 → 产物相对路径。`/pricing` 落到 `pricing/index.html`，靠 nginx 的目录索引命中。 */
export function outputPathFor(routePath: string): string {
  if (routePath === "/") {
    return "index.html";
  }
  return `${routePath.replace(/^\/+/u, "")}/index.html`;
}

export function buildSitemap(
  routes: readonly PageSeo[],
  origin: string,
  lastmod: string,
): string {
  const entries = routes
    .map((route) =>
      [
        "  <url>",
        `    <loc>${escapeHtml(buildCanonicalUrl(origin, route.path))}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${route.changefreq}</changefreq>`,
        `    <priority>${route.priority.toFixed(1)}</priority>`,
        "  </url>",
      ].join("\n"),
    )
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    "</urlset>",
    "",
  ].join("\n");
}

/** 应用区不该被收录：那些路径返回的是空 SPA 外壳，没有内容还会稀释权重。 */
export const ROBOTS_DISALLOW: readonly string[] = [
  "/api/",
  "/app",
  "/platform",
  "/settings",
];

export function buildRobots(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${normalizeOrigin(origin)}/sitemap.xml`,
    "",
  ].join("\n");
}
