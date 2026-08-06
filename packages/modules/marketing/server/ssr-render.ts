import { getLocaleNativeLabel, normalizeLocale } from "@be-water/shared";

import {
  resolveSectionGaps,
  resolveSectionLayout,
} from "../shared/section-schema.js";
import {
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../shared/site-cms.js";
import { withSiteLocale } from "../shared/site-locale.js";
import { loadMarketingSiteCss } from "../shared/load-marketing-site-css.js";
import {
  marketingSiteColorModeScript,
  marketingSiteThemeCss,
} from "../shared/marketing-site-theme.js";
import {
  resolveThemeSettings,
  THEME_SECTION_SPACING,
} from "../shared/theme-sections.js";

import { escapeHtml } from "./site.util.js";
import {
  renderFooterHtml,
  renderHeaderHtml,
  renderSectionHtml,
  type LocaleSwitcherOption,
} from "./ssr-sections.js";

import type { SitemapEntry } from "./site.service.js";

/** 主题变量 + 共享语义 CSS（`shared/marketing-site.css`）。 */
function siteCss(theme_settings: unknown): string {
  return `${marketingSiteThemeCss(theme_settings, ":root")}\n${loadMarketingSiteCss()}`;
}

/**
 * hreflang：各语言互指 + `x-default` 指主语言。
 *
 * 只列**已发布**的语言（`page.alternates` 就是这么算出来的）——列上没有内容的语言，
 * Google 会因为互指不成立而整组忽略。
 */
function renderAlternateLinksHtml(
  base: string,
  page: PublicMarketingPage,
  defaultLocale: string,
): string {
  if (page.alternates.length < 2) return "";
  const links = page.alternates.map(
    (alternate) =>
      `<link rel="alternate" hreflang="${escapeHtml(alternate.locale)}" href="${escapeHtml(`${base}${alternate.path}`)}" />`,
  );
  const primary = page.alternates.find(
    (alternate) => alternate.locale === defaultLocale,
  );
  if (primary) {
    links.push(
      `<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${base}${primary.path}`)}" />`,
    );
  }
  return links.join("\n  ");
}

function localeSwitcherOptions(
  page: PublicMarketingPage,
  current: string,
): LocaleSwitcherOption[] {
  return page.alternates.map((alternate) => ({
    locale: alternate.locale,
    path: alternate.path,
    label: getLocaleNativeLabel(alternate.locale),
    current: alternate.locale === current,
  }));
}

export function renderMarketingHtml(input: {
  origin: string;
  site: PublicMarketingSite;
  page: PublicMarketingPage;
  /**
   * SPA 引导脚本 HTML（`renderSpaBootstrapHtml()`）。
   *
   * 绑定域上每个 HTML 文档都由 SSR 产出，所以站点的交互层能不能活全看它——
   * 缺了就只是一张静态页：账户入口、明暗切换按钮、`requires_member` 页的正文
   * 都不会出现。
   */
  spaBootstrapHtml?: string;
  /** 会员专属页：正文占位 + robots noindex（token 不随 HTML 请求）。 */
  memberGate?: boolean;
}): string {
  const {
    origin,
    site,
    page,
    spaBootstrapHtml = "",
    memberGate = false,
  } = input;
  const theme = resolveThemeSettings(site.theme_settings);
  const sections = memberGate ? [] : page.sections;
  // 段间距显式算好落到每一段上，与 SPA 侧同一个函数
  const gaps = resolveSectionGaps(
    sections.map((section) => resolveSectionLayout(section.settings)),
    theme.section_spacing ?? THEME_SECTION_SPACING.default,
  );
  const sectionCtx = {
    pages: site.pages,
    currentPath: page.path,
    locale: normalizeLocale(page.locale, site.default_locale),
    defaultLocale: site.default_locale,
    sectionSpacing: theme.section_spacing ?? THEME_SECTION_SPACING.default,
  };
  const sectionsHtml = sections
    .map((section, index) =>
      renderSectionHtml(section, gaps[index], sectionCtx),
    )
    .join("\n");
  const base = origin.replace(/\/$/u, "");
  const locale = normalizeLocale(page.locale, site.default_locale);
  // canonical 指向**本页语言**的 URL：默认语言无前缀、其余 `/{locale}/...`。
  // 请求语言没有内容而回落到默认语言时（见 site.service 的 effectiveLocale），
  // 这里自然会指回无前缀入口，不会把回落出来的页面当成一份独立内容收录。
  const localizedPath = withSiteLocale(page.path, locale, site.default_locale);
  const canonical = `${base}${localizedPath === "/" ? "/" : localizedPath}`;
  const alternateLinks = renderAlternateLinksHtml(
    base,
    page,
    site.default_locale,
  );
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

  const logoUrl =
    theme.logo_url && theme.logo_url !== "" ? theme.logo_url : null;
  // 页头 / 页脚区各是一串 section：本体走专用渲染，其余（公告条等）走通用那套
  const headerHtml = site.header
    .map((section) =>
      section.type === "header"
        ? renderHeaderHtml({
            section,
            siteName: site.site_name,
            logoUrl,
            homeHref: withSiteLocale("/", locale, site.default_locale),
            locales: localeSwitcherOptions(page, locale),
            pages: site.pages,
            currentPath: page.path,
            locale,
            defaultLocale: site.default_locale,
          })
        : renderSectionHtml(section, 0, sectionCtx),
    )
    .join("");
  const footerHtml = site.footer
    .map((section) =>
      section.type === "footer"
        ? renderFooterHtml({
            section,
            siteName: site.site_name,
            logoUrl,
          })
        : renderSectionHtml(section, 0, sectionCtx),
    )
    .join("");

  const robotsMeta = memberGate
    ? `<meta name="robots" content="noindex, nofollow" />`
    : "";
  const mainHtml = memberGate
    ? `<div class="wrap" style="padding:4rem 1.5rem;text-align:center">
      <h1 style="font-size:1.5rem;font-weight:600;margin-bottom:.75rem">${escapeHtml(page.title)}</h1>
      <p class="muted" style="margin-bottom:1.5rem">${escapeHtml(page.description || "Sign in to read this content.")}</p>
      <p><a class="btn" href="/member/login">Sign in</a></p>
    </div>`
    : sectionsHtml;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  ${robotsMeta}
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  ${alternateLinks}
  <script type="application/ld+json">${jsonLd}</script>
  <script>${marketingSiteColorModeScript()}</script>
  <style>${siteCss(site.theme_settings)}</style>
</head>
<body>
  <!--
    正文包在 #root 里：SPA 接管时走 createRoot(#root)，会把这份 SSR 内容整片换掉。
    没有它 main.tsx 的 getElementById("root") 直接抛，页面就停在静态 HTML 上
    ——账户入口、明暗切换、会员页正文都指望 SPA 到场。
  -->
  <div id="root">
  ${headerHtml}
  <main${page.settings.bg_color || page.settings.fg_color ? ` style="${[
    page.settings.bg_color ? `background-color:${page.settings.bg_color}` : "",
    page.settings.fg_color ? `color:${page.settings.fg_color}` : "",
  ]
    .filter(Boolean)
    .join(";")}"` : ""}>
    ${mainHtml}
  </main>
  ${footerHtml}
  </div>
  ${spaBootstrapHtml}
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
    <p><a href="/member/login">Sign in</a></p>
  </main>
</body>
</html>`;
}

/**
 * sitemap：一种语言一条 `<url>`，每条挂上全组的 `xhtml:link` 备选。
 *
 * 不能只输出逻辑路径——那样各语言会塌成同一个 `<loc>`，除默认语言外都不会被收录。
 */
export function renderSitemapXml(
  origin: string,
  entries: Array<Pick<SitemapEntry, "path"> & Partial<SitemapEntry>>,
): string {
  const base = origin.replace(/\/$/u, "");
  const absolute = (path: string): string =>
    `${base}${path === "/" ? "/" : path}`;
  const urls = entries
    .map((item) => {
      const lastmod = item.updated_at
        ? `<lastmod>${escapeHtml(item.updated_at.slice(0, 10))}</lastmod>`
        : "";
      const alternates = (item.alternates ?? [])
        .map(
          (alternate) =>
            `<xhtml:link rel="alternate" hreflang="${escapeHtml(alternate.locale)}" href="${escapeHtml(absolute(alternate.path))}"/>`,
        )
        .join("");
      return `<url><loc>${escapeHtml(absolute(item.path))}</loc>${lastmod}${alternates}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

export function renderRobotsTxt(origin: string): string {
  const base = origin.replace(/\/$/u, "");
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}
