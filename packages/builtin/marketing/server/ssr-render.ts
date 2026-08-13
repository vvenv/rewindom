import { getLocaleNativeLabel, normalizeLocale } from "@rewindom/shared";

import { escapeHtml } from "../shared/html.js";
import { loadMarketingSiteCssFor } from "../shared/load-marketing-site-css.js";
import {
  marketingSiteColorModeScript,
  marketingSiteThemeCss,
} from "../shared/marketing-site-theme.js";
import { collectSectionTypes } from "../shared/sections/collect-types.js";
import { type DocRenderContext } from "../shared/sections/render-context.js";
import {
  type PublicMarketingPage,
  type PublicMarketingSite,
} from "../shared/site-cms.js";
import { SITE_ENHANCE_HASH } from "../shared/site-enhance.js";
import { withSiteLocale } from "../shared/site-locale.js";
import {
  resolveThemeSettings,
  THEME_SECTION_SPACING,
} from "../shared/theme-sections.js";

import { renderPageSectionsHtml } from "./render-page-sections-html.js";
import {
  renderFooterHtml,
  renderHeaderHtml,
  renderSectionHtml,
  type LocaleSwitcherOption,
} from "./ssr-sections.js";

import type { SitemapEntry } from "./site.service.js";

/** 主题变量 + 本页用到的那几段语义 CSS。 */
function siteCss(theme_settings: unknown, types: ReadonlySet<string>): string {
  return `${marketingSiteThemeCss(theme_settings, ":root")}\n${loadMarketingSiteCssFor(types)}`;
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

/**
 * 社交分享卡片（Open Graph + Twitter）。
 *
 * `og:image` 必须是**绝对地址**——抓取器不带页面上下文，相对路径一律取不到图。
 * 页面级留空回落站点级默认；都没有就整组图片标签不出，而不是出一个空 `content`
 *（空值会让部分平台显示成裂图占位）。
 */
function renderSocialMetaHtml(input: {
  base: string;
  canonical: string;
  title: string;
  description: string;
  siteName: string;
  image: string | null;
  locale: string;
}): string {
  const absolute = input.image
    ? input.image.startsWith("/")
      ? `${input.base}${input.image}`
      : input.image
    : null;

  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(input.siteName)}" />`,
    `<meta property="og:title" content="${input.title}" />`,
    `<meta property="og:url" content="${escapeHtml(input.canonical)}" />`,
    `<meta property="og:locale" content="${escapeHtml(input.locale)}" />`,
    input.description
      ? `<meta property="og:description" content="${input.description}" />`
      : "",
    absolute
      ? `<meta property="og:image" content="${escapeHtml(absolute)}" />`
      : "",
    // 有图走大图卡片，没图走摘要卡片——给 summary_large_image 却没有图会显示成空白框
    `<meta name="twitter:card" content="${absolute ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${input.title}" />`,
    input.description
      ? `<meta name="twitter:description" content="${input.description}" />`
      : "",
    absolute
      ? `<meta name="twitter:image" content="${escapeHtml(absolute)}" />`
      : "",
  ].filter(Boolean);

  return tags.join("\n  ");
}

function siteEnhanceScriptTag(): string {
  return `<script defer src="/api/public/site-enhance.js?v=${escapeHtml(SITE_ENHANCE_HASH)}"></script>`;
}

export function renderMarketingHtml(input: {
  origin: string;
  site: PublicMarketingSite;
  page: PublicMarketingPage;
  /** 会员专属页且访客：正文占位 + robots noindex（已登录由 SSR 解锁）。 */
  memberGate?: boolean;
  /** 页头账户入口 HTML（登录链或已登录菜单）；见 `site-account-entry.ts`。 */
  accountEntryHtml?: string;
  /** 本租户已开通的 entitlement；贡献段据此决定渲不渲染，见 `site-entitlements.ts`。 */
  enabledEntitlements?: ReadonlySet<string>;
  /**
   * 文档库数据（`doc-*` 段的数据源）。
   *
   * 文档模板页必须带；普通页面只有在页面 / 页头 / 页脚里真的摆了 `doc-*` 段时才需要
   * ——不带等于那几段什么都不渲染，所以漏传的后果是内容少了而不是多了。
   */
  docContext?: DocRenderContext;
  /**
   * 站里有没有已发布文档（页头搜索入口据此决定渲不渲染）。
   *
   * 与 `docContext.docs` 分开传：搜索框只要这一个布尔值，不该逼调用方为它查一遍
   * 全库目录——它默认是开的，那会落在每一次页面渲染上。
   */
  hasDocs?: boolean;
  /**
   * 贡献段的按请求数据，按模块 id 分键（见 `SectionRenderContext.contributed`）。
   *
   * marketing 只负责原样透传：会员登录表单要的「验证码开没开、上次提交错在哪」
   * 这类东西按请求变，塞不进段的 settings，也不该让 marketing 认识它们的形状。
   */
  contributed?: Readonly<Record<string, unknown>>;
  /** 声明了 `default_tenant_only` 的段据此决定渲不渲染（见 `sections/html.ts`）。 */
  isDefaultTenant?: boolean;
}): string {
  const {
    origin,
    site,
    page,
    memberGate = false,
    accountEntryHtml = "",
    enabledEntitlements,
    docContext,
    contributed,
    isDefaultTenant,
  } = input;
  const theme = resolveThemeSettings(site.theme_settings);
  const sectionCtx = {
    pages: site.pages,
    currentPath: page.path,
    locale: normalizeLocale(page.locale, site.default_locale),
    defaultLocale: site.default_locale,
    sectionSpacing: theme.section_spacing ?? THEME_SECTION_SPACING.default,
    // 贡献段据此决定渲不渲染；不传等于一个贡献段都不出（少了而不是多了，方向安全）
    enabledEntitlements,
    contributed,
    isDefaultTenant,
    ...docContext,
  };
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

  const socialMeta = renderSocialMetaHtml({
    base,
    canonical,
    title,
    description,
    siteName: site.site_name,
    // 页面级覆盖站点级；都没有就不出图片标签
    image: page.settings.og_image ?? theme.og_image ?? null,
    locale,
  });

  const logoUrl =
    theme.logo_url && theme.logo_url !== "" ? theme.logo_url : null;

  /*
   * 站点没传 favicon 就回落产品默认 `/favicon.svg`——**必须显式输出这一行**：
   * 不写 `<link rel="icon">` 时浏览器会去猜 `/favicon.ico`，官网这个路径上没有东西，
   * 结果是标签页挂一个空白图标。
   */
  const faviconUrl =
    theme.favicon_url && theme.favicon_url !== ""
      ? theme.favicon_url
      : "/favicon.svg";
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
            docs: docContext?.docs,
            hasDocs: input.hasDocs ?? (docContext?.docs?.length ?? 0) > 0,
            currentPath: page.path,
            locale,
            defaultLocale: site.default_locale,
            accountEntryHtml,
          })
        : renderSectionHtml(section, 0, sectionCtx),
    )
    .join("");
  const footerHtml = site.footer
    .map((section) =>
      section.type === "footer"
        ? // 页头页脚共用一套块，所以喂给它们的也是同一份上下文
          renderFooterHtml({
            section,
            siteName: site.site_name,
            logoUrl,
            homeHref: withSiteLocale("/", locale, site.default_locale),
            locales: localeSwitcherOptions(page, locale),
            pages: site.pages,
            docs: docContext?.docs,
            hasDocs: input.hasDocs ?? (docContext?.docs?.length ?? 0) > 0,
            currentPath: page.path,
            locale,
            defaultLocale: site.default_locale,
            accountEntryHtml,
          })
        : renderSectionHtml(section, 0, sectionCtx),
    )
    .join("");

  /*
   * 两种 noindex：会员页是**结构性**的（SSR 只有占位，正文要登录才拉得到，收录了也
   * 是一张空页），逐页开关是租户**主动**声明的。前者连 follow 一起掐，后者只是不收录
   * 本页，页上的链接照常传递权重。
   */
  const robotsMeta = memberGate
    ? `<meta name="robots" content="noindex, nofollow" />`
    : page.settings.noindex
      ? `<meta name="robots" content="noindex" />`
      : "";
  const mainInner = memberGate
    ? `<div class="wrap" style="padding:4rem 1.5rem;text-align:center">
      <h1 style="font-size:1.5rem;font-weight:600;margin-bottom:.75rem">${escapeHtml(page.title)}</h1>
      <p class="muted" style="margin-bottom:1.5rem">${escapeHtml(page.description || "Sign in to read this content.")}</p>
      <p><a class="btn" href="/member/login?redirect=${encodeURIComponent(localizedPath)}">Sign in</a></p>
    </div>`
    : renderPageSectionsHtml(site, page, {
        enabledEntitlements,
        docContext,
        contributed,
        isDefaultTenant,
      });

  const mainStyle =
    page.settings.bg_color || page.settings.fg_color
      ? ` style="${[
          page.settings.bg_color
            ? `background-color:${page.settings.bg_color}`
            : "",
          page.settings.fg_color ? `color:${page.settings.fg_color}` : "",
        ]
          .filter(Boolean)
          .join(";")}"`
      : "";
  const mainGateAttrs = memberGate
    ? ` data-member-gate data-path="${escapeHtml(page.path)}" data-locale="${escapeHtml(locale)}"`
    : "";

  /*
   * 只发本页用得上的段样式。
   *
   * 会员闸门下 SSR 正文是占位，但**照样要收 `page.sections`**：解锁后的正文由
   * site-enhance 拉 `page-html` 写进 `main`（见 client/enhance/gated.ts），那时
   * 首屏 CSS 早发完了，这里不收就是解锁后一页裸样式。
   */
  const usedSectionTypes = collectSectionTypes(site.header);
  collectSectionTypes(site.footer, usedSectionTypes);
  collectSectionTypes(page.sections, usedSectionTypes);

  return `<!DOCTYPE html>
<html lang="${escapeHtml(locale)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <link rel="icon" href="${escapeHtml(faviconUrl)}" />
  ${robotsMeta}
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  ${alternateLinks}
  ${socialMeta}
  <script type="application/ld+json">${jsonLd}</script>
  <script>${marketingSiteColorModeScript()}</script>
  <style>${siteCss(site.theme_settings, usedSectionTypes)}</style>
</head>
<body>
  <!--
    公开站是 SSR 静态 HTML + site-enhance（无 React）。
    交互（明暗、表单、账户菜单、会员正文）由 defer 脚本渐进增强。
  -->
  <div class="marketing-site-root" data-page-path="${escapeHtml(page.path)}" data-page-locale="${escapeHtml(locale)}">
  <div class="site-stack">
  ${headerHtml}
  <main class="site-main"${mainGateAttrs}${mainStyle}>
    ${mainInner}
  </main>
  ${footerHtml}
  </div>
  </div>
  ${siteEnhanceScriptTag()}
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
<urlset xmlns="http://www.w3.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`;
}

export function renderRobotsTxt(origin: string): string {
  const base = origin.replace(/\/$/u, "");
  return `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;
}
