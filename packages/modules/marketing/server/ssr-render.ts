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
import {
  HERO_GLOW_BACKGROUND,
  resolveThemeSettings,
  themeFontCss,
  themePageWidthCss,
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

/**
 * 静态 CSS：用原生 CSS 变量复刻 shadcn 的中性色 / 圆角 / 边框语汇，
 * 让 SSR 首屏与 SPA 水合后（Tailwind token）观感一致。
 */
function siteCss(
  accent: string,
  fontCss: string,
  pageWidth: string,
  canvas?: { bg?: string | null; fg?: string | null },
): string {
  const bg = canvas?.bg || "#ffffff";
  const fg = canvas?.fg || "#0a0a0a";
  return `
    :root {
      --site-page-width: ${pageWidth};
      --accent: ${accent};
      /* 与 SPA 侧同名，hero 光晕那段渐变两处共用 */
      --site-accent: ${accent};
      --fg: ${fg};
      --muted-fg: #737373;
      --bg: ${bg};
      --muted-bg: #fafafa;
      --border: rgba(10,10,10,.12);
      --radius: .75rem;
      color-scheme: light;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ${fontCss}; line-height: 1.6; color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    h1, h2, h3 { letter-spacing: -.02em; margin: 0; }
    p { margin: 0; }
    ul, ol, dl { margin: 0; padding: 0; list-style: none; }
    .wrap { width: 100%; max-width: var(--site-page-width, 72rem); margin: 0 auto; padding: 0 1.5rem; }
    .muted { color: var(--muted-fg); font-size: .875rem; }
    .lead { color: var(--muted-fg); }
    .eyebrow { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-fg); }

    .site-header { border-bottom: 1px solid var(--border); background: rgba(255,255,255,.85); backdrop-filter: blur(12px); }
    .site-header.sticky { position: sticky; top: 0; z-index: 40; }
    .header-row { display: flex; align-items: center; gap: 1rem; height: 3.5rem; }
    .header-row.header-layout-centered { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; }
    .header-layout-centered .header-nav { justify-self: center; }
    .header-layout-centered .header-actions { justify-self: end; }
    .brand { display: flex; align-items: center; gap: .5rem; font-weight: 600; }
    .logo { height: 1.5rem; width: auto; }
    .header-nav { display: flex; flex-wrap: wrap; gap: .25rem; }
    .header-nav a { padding: .375rem .625rem; border-radius: .5rem; font-size: .875rem; color: var(--muted-fg); }
    .header-actions { margin-left: auto; display: flex; align-items: center; gap: .5rem; }
    /* 语言切换：icon + dropdown，与 client SiteChrome LocaleSwitcher 对齐 */
    .locale-switcher { position: relative; }
    .locale-switcher > summary { list-style: none; display: inline-flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border-radius: .5rem; color: var(--fg); cursor: pointer; }
    .locale-switcher > summary::-webkit-details-marker { display: none; }
    .locale-switcher > summary:hover { background: var(--muted-bg); }
    .locale-switcher-menu { position: absolute; right: 0; top: calc(100% + .25rem); z-index: 50; min-width: 8rem; display: grid; gap: .125rem; padding: .25rem; border: 1px solid var(--border); border-radius: .5rem; background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,.08); }
    .locale-switcher-menu a { display: block; padding: .375rem .625rem; border-radius: .375rem; font-size: .875rem; color: var(--muted-fg); white-space: nowrap; }
    .locale-switcher-menu a:hover { background: var(--muted-bg); color: var(--fg); }
    .locale-switcher-menu a[aria-current="true"] { background: var(--muted-bg); color: var(--fg); font-weight: 500; }
    .site-footer { margin-top: 3rem; border-top: 1px solid var(--border); background: var(--muted-bg); }
    .footer-grid { display: grid; gap: 2rem; padding-top: 3rem; padding-bottom: 3rem; grid-template-columns: 1.4fr repeat(3, 1fr); }
    .footer-grid h2 { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-fg); margin-bottom: .75rem; }
    .footer-grid ul { display: grid; gap: .5rem; font-size: .875rem; }
    .footer-grid a { color: var(--muted-fg); }
    .footer-legal { border-top: 1px solid var(--border); padding-top: 1.5rem; padding-bottom: 1.5rem; font-size: .75rem; color: var(--muted-fg); }

    .btn { display: inline-flex; align-items: center; justify-content: center; gap: .5rem; padding: .5rem 1rem; border-radius: .5rem; background: var(--accent); color: #fff; font-size: .875rem; font-weight: 500; border: 1px solid transparent; }
    .btn-secondary { background: transparent; border-color: var(--border); color: var(--fg); }
    .btn-ghost { background: transparent; border-color: transparent; color: var(--fg); }
    .btn-block { display: flex; width: 100%; margin-top: 1.75rem; }
    .btn-row { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 2rem; }
    .btn-row.center { justify-content: center; }

    /* section 版式：间距走内联 CSS 变量，其余与 client/components/sections 对齐 */
    /* 段间距显式落在后一段上方（首段为 0），不靠 margin 折叠 */
    .sec { scroll-margin-top: 4rem; margin-top: calc(var(--sec-gap, 0px) * .7); }
    .sec-band { padding-top: calc(var(--sec-pt, 32px) * .7); padding-bottom: calc(var(--sec-pb, 32px) * .7); }
    @media (min-width: 640px) { .sec { margin-top: var(--sec-gap, 0px); } .sec-band { padding-top: var(--sec-pt, 32px); padding-bottom: var(--sec-pb, 32px); } }
    /* 限宽在 section 内部：色块与正文各自一档，组合出「通栏色带 + 居中正文」等排版 */
    .sec-w-page { width: 100%; max-width: var(--site-page-width, 72rem); margin: 0 auto; }
    .sec-content { padding: 0 1.5rem; }
    .sec-c-default { width: 100%; max-width: var(--site-page-width, 72rem); margin: 0 auto; }
    .sec-c-narrow { width: 100%; max-width: 48rem; margin: 0 auto; }
    /* 容器段的列里外层已限宽并给了留白，section 不再自带 gutter，full 退化为 page */
    .grp-col .sec-band, .sec-c-contained { max-width: none; }
    .sec-c-contained { width: 100%; padding-left: 0; padding-right: 0; }

    /* 容器段：窄屏一列到底，桌面进 12 栏。与 client 的 GroupSection 同构 */
    .grp { display: grid; grid-template-columns: minmax(0,1fr); gap: calc(var(--grp-gap, 40px) * .7); }
    .grp-col { min-width: 0; }
    @media (min-width: 768px) {
      .grp { grid-template-columns: repeat(12, minmax(0,1fr)); gap: var(--grp-gap, 40px); align-items: start; }
      .grp.grp-stretch { align-items: stretch; }
      ${Array.from({ length: 12 }, (_, index) => `.grp-span-${index + 1} { grid-column: span ${index + 1} / span ${index + 1}; }`).join("\n      ")}
      /* sticky 必须配 align-self:start：拉伸满高的列没有可滚动的余量，粘不住 */
      .grp-sticky { position: sticky; top: 5rem; align-self: start; }
    }
    /* 堆叠顺序只在窄屏有意义——桌面永远按声明顺序从左到右 */
    @media (max-width: 767px) {
      .grp-stack-first { order: -1; }
      .grp-stack-last { order: 1; }
    }
    /* 光晕跟着色块走：顶到 section 容器上沿（含上留白）。isolation 不能少——
       z-index:-1 没有自己的层叠上下文会掉到祖先背景之后 */
    .sec-band.has-glow { position: relative; isolation: isolate; }
    .sec-glow { position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit; background: ${HERO_GLOW_BACKGROUND}; }
    /* 色块含上下留白，内容不因换底色而横向位移 */
    .sec-bg-muted, .sec-bg-accent, .sec-bg-outline, .sec-radius-default { border-radius: .75rem; }
    /* 通栏色块贴着视口边，圆角会露出两个缺口 */
    .sec-w-full.sec-bg-muted, .sec-w-full.sec-bg-accent, .sec-w-full.sec-bg-outline, .sec-w-full.sec-radius-default { border-radius: 0; }
    .sec-bg-muted { background: var(--muted-bg); }
    .sec-bg-accent { background: color-mix(in srgb, var(--accent) 8%, transparent); }
    .sec-bg-outline { border: 1px solid var(--border); }
    .sec-band.has-surface { background-color: var(--sec-bg, transparent); color: var(--sec-fg, inherit); }
    .sec-band.has-surface[style*="--sec-bw"] { border: var(--sec-bw) solid var(--sec-bc, var(--border)); }
    .sec-band.has-surface[style*="--sec-radius"] { border-radius: var(--sec-radius); }
    .sec-divider-top { border-top: 1px solid var(--border); }
    .sec-divider-bottom { border-bottom: 1px solid var(--border); }
    .sec-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 1rem; margin-bottom: 2rem; }
    .sec-head h2 { font-size: 1.875rem; }
    .sec-head .lead { margin-top: .75rem; max-width: 42rem; }

    .hero h1 { font-size: 3rem; line-height: 1.1; max-width: 48rem; margin-top: 1rem; }
    .hero .lead { margin-top: 1.25rem; max-width: 36rem; font-size: 1.125rem; }
    .hero .eyebrow { color: var(--accent); text-transform: none; letter-spacing: .02em; font-size: .875rem; font-weight: 500; }
    .hero.center { text-align: center; }
    .hero.center h1, .hero.center .lead, .hero.center .stats { margin-left: auto; margin-right: auto; }
    .stats { display: grid; gap: 1.5rem; grid-template-columns: repeat(3, minmax(0,1fr)); max-width: 42rem; margin-top: 3.5rem; }
    .stats dt { font-size: .75rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-fg); }
    .stats dd { margin: .25rem 0 0; font-size: .875rem; font-weight: 500; }

    .grid { display: grid; gap: .75rem; }
    .grid.cols-2 { grid-template-columns: repeat(2, minmax(0,1fr)); }
    .grid.cols-3 { grid-template-columns: repeat(3, minmax(0,1fr)); }
    .grid.cols-4 { grid-template-columns: repeat(4, minmax(0,1fr)); }
    .card { display: block; height: 100%; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg); padding: 1.25rem; }
    .card-plain { border-color: transparent; padding: .5rem 0; }
    .card .title { display: block; font-weight: 500; }
    .card .muted { display: block; margin-top: .375rem; }
    .card code { display: block; margin-top: .75rem; font-size: .75rem; color: var(--accent); }
    .card .stat-value { display: block; font-size: 1.875rem; font-weight: 600; color: var(--accent); }

    .spec { border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; }
    .spec-row { display: grid; grid-template-columns: 5rem 1fr; gap: 1rem; padding: 1rem 1.25rem; font-size: .875rem; background: var(--bg); border-top: 1px solid var(--border); }
    .spec > :first-child { border-top: 0; }
    .spec-row dt { color: var(--muted-fg); }
    .spec-row dd { margin: 0; font-weight: 500; }
    .qa { padding: 1.25rem 1.5rem; background: var(--bg); border-top: 1px solid var(--border); }
    .qa dt { font-weight: 500; }
    .qa dd { margin: .375rem 0 0; font-size: .875rem; color: var(--muted-fg); }

    .split { display: grid; gap: 2.5rem; grid-template-columns: 1fr 1.1fr; }
    .split h2 { font-size: 1.875rem; }
    .split .lead { margin-top: .75rem; }

    .plans { align-items: stretch; gap: 1rem; }
    .plan { position: relative; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 1rem; background: var(--bg); padding: 1.5rem; }
    .plan.featured { border-color: color-mix(in srgb, var(--accent) 50%, transparent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent); }
    .plan .badge { position: absolute; top: -.625rem; left: 1.5rem; border-radius: 999px; background: var(--accent); color: #fff; font-size: .75rem; font-weight: 500; padding: .125rem .625rem; }
    .plan h3 { font-weight: 500; }
    .plan .price { margin-top: 1.25rem; font-size: 1.875rem; font-weight: 600; }
    .checks { margin-top: 1.5rem; flex: 1; display: grid; gap: .625rem; font-size: .875rem; color: var(--muted-fg); align-content: start; }
    .checks li::before { content: "✓"; color: var(--accent); margin-right: .5rem; }

    .band.center { text-align: center; }
    .band.center .lead, .band.center .btn-row { margin-left: auto; margin-right: auto; }
    .band h2 { font-size: 1.875rem; }
    .band .lead { margin-top: .75rem; max-width: 36rem; }

    /* 与 client/components/MarkdownProse.tsx 的排版一一对应，改一处要改两处 */
    .prose :is(h1,h2) { font-size: 1.5rem; font-weight: 600; line-height: 1.25; margin: 3rem 0 1rem; }
    .prose h2 { font-size: 1.25rem; padding-bottom: .5rem; border-bottom: 1px solid var(--border); }
    .prose h3 { font-size: 1rem; font-weight: 600; line-height: 1.25; margin: 2rem 0 .75rem; }
    .prose > :first-child { margin-top: 0; }
    .prose p { margin: 1rem 0; line-height: 1.75; color: var(--muted-fg); }
    .prose ul, .prose ol { list-style: revert; padding-left: 1.5rem; margin: 1rem 0; color: var(--muted-fg); }
    .prose li { line-height: 1.75; }
    .prose li + li { margin-top: .5rem; }
    .prose a { color: var(--accent); font-weight: 500; text-decoration: underline; text-underline-offset: 4px; }
    .prose strong { font-weight: 600; color: var(--fg); }
    .prose code { border-radius: .25rem; background: var(--muted-bg); padding: .125rem .375rem; font-size: .85em; color: var(--fg); }
    .prose pre { margin: 1.25rem 0; overflow-x: auto; border: 1px solid var(--border); border-radius: .75rem; background: var(--muted-bg); padding: 1rem; font-size: .875rem; line-height: 1.5; }
    .prose pre code { background: transparent; padding: 0; font-size: inherit; }
    .prose blockquote { margin: 1.25rem 0; border-left: 2px solid color-mix(in srgb, var(--accent) 50%, transparent); padding-left: 1rem; color: var(--muted-fg); font-style: italic; }
    .prose img { display: block; margin: 1.5rem 0; max-width: 100%; height: auto; border: 1px solid var(--border); border-radius: .75rem; }
    .prose .table-wrap { margin: 1.5rem 0; overflow-x: auto; border: 1px solid var(--border); border-radius: .75rem; }
    .prose table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    .prose thead { background: var(--muted-bg); }
    .prose th { border-bottom: 1px solid var(--border); padding: .625rem 1rem; text-align: left; font-weight: 500; }
    .prose td { border-bottom: 1px solid var(--border); padding: .625rem 1rem; color: var(--muted-fg); }
    .prose hr { margin: 2.5rem 0; border: 0; border-top: 1px solid var(--border); }

    .page-head { padding-top: 3rem; }
    .page-head h1 { font-size: 1.875rem; }
    .page-head p { margin-top: .75rem; color: var(--muted-fg); }

    /* page-menu section list style */
    .page-menu-list ul { display: grid; gap: .125rem; }
    .page-menu-list a { display: block; border-radius: .5rem; padding: .375rem .625rem; color: var(--muted-fg); }
    .page-menu-list li[aria-current="page"] a { background: var(--muted-bg); color: var(--fg); font-weight: 500; }
    .page-menu-list { font-size: .875rem; }

    @media (max-width: 900px) {
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .split { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .grid.cols-2, .grid.cols-3, .grid.cols-4, .stats, .footer-grid { grid-template-columns: 1fr; }
      .hero h1 { font-size: 2.25rem; }
      .header-nav { display: none; }
    }`;
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
  spaEntrySrc?: string;
}): string {
  const { origin, site, page, spaEntrySrc } = input;
  const theme = resolveThemeSettings(site.theme_settings);
  const sections = page.sections;
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
            showLocaleSwitcher: theme.show_locale_switcher === true,
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

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  ${alternateLinks}
  <script type="application/ld+json">${jsonLd}</script>
  <style>${siteCss(theme.primary_color ?? "#0f766e", themeFontCss(theme.font_family), themePageWidthCss(theme.page_width), { bg: theme.bg_color, fg: theme.fg_color })}</style>
</head>
<body>
  ${headerHtml}
  <main${page.settings.bg_color || page.settings.fg_color ? ` style="${[
    page.settings.bg_color ? `background-color:${page.settings.bg_color}` : "",
    page.settings.fg_color ? `color:${page.settings.fg_color}` : "",
  ]
    .filter(Boolean)
    .join(";")}"` : ""}>
    ${sectionsHtml}
  </main>
  ${footerHtml}
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
