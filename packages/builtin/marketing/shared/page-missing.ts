import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import { escapeHtml } from "./html.js";
import { withSiteLocale } from "./site-locale.js";

import type { PublicMarketingPage } from "./site-cms.js";

export interface PageMissingCopy {
  title: string;
  description: string;
  home: string;
}

const COPY: Record<AppLocale, PageMissingCopy> = {
  "zh-CN": {
    title: "页面不存在",
    description: "这个地址没有已发布的内容，可能是链接过期了。",
    home: "回到首页",
  },
  en: {
    title: "Page not found",
    description: "This page isn't published, or the link is outdated.",
    home: "Back to home",
  },
};

export function pageMissingCopy(locale: string): PageMissingCopy {
  return COPY[normalizeLocale(locale)];
}

/** 内置 404 正文。自定义 `/404` 页走普通 CMS 渲染，不经过这里。 */
export function renderPageMissingHtml(input: {
  locale: string;
  homeHref: string;
}): string {
  const copy = pageMissingCopy(input.locale);
  return `<div class="page-missing">
  <p class="page-missing-code" aria-hidden="true">404</p>
  <h1>${escapeHtml(copy.title)}</h1>
  <p class="lead">${escapeHtml(copy.description)}</p>
  <p class="btn-row center"><a class="btn" href="${escapeHtml(input.homeHref)}">${escapeHtml(copy.home)}</a></p>
</div>`;
}

/**
 * 给 `renderMarketingHtml` 用的合成页：套站点 chrome，正文由 `mainHtml` 注入。
 * `noindex` 必开——同一张兜底会出现在无数死链上。
 */
export function builtinNotFoundPage(input: {
  locale: AppLocale;
  defaultLocale: AppLocale;
}): PublicMarketingPage {
  const copy = pageMissingCopy(input.locale);
  const path = withSiteLocale("/404", input.locale, input.defaultLocale);
  return {
    slug: "404",
    locale: input.locale,
    kind: "page",
    title: copy.title,
    description: copy.description,
    sections: [],
    settings: { noindex: true },
    visibility: "public",
    path: "/404",
    alternates: [{ locale: input.locale, path }],
    updated_at: "1970-01-01T00:00:00.000Z",
  };
}
