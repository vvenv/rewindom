/**
 * 把已发布页的 sections 渲成 main 内层 HTML（SSR 与会员 page-html 共用）。
 */

import { normalizeLocale } from "@be-water/shared";

import {
  resolveSectionGaps,
  resolveSectionLayout,
} from "../shared/section-schema.js";
import {
  resolveThemeSettings,
  THEME_SECTION_SPACING,
} from "../shared/theme-sections.js";

import { renderSectionHtml } from "./ssr-sections.js";

import type { DocRenderContext } from "../shared/sections/render-context.js";
import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

export function renderPageSectionsHtml(
  site: PublicMarketingSite,
  page: PublicMarketingPage,
  /**
   * 本租户已开通的 entitlement；贡献段据此决定渲不渲染（见 `site-entitlements.ts`）。
   * 不传等于一个贡献段都不出——少了而不是多了，这个方向是安全的。
   */
  enabledEntitlements?: ReadonlySet<string>,
  /** 文档库数据；只有页面上摆了 `doc-*` 段时才有意义，见 `render-context.ts`。 */
  docContext?: DocRenderContext,
  /**
   * 贡献段的按请求数据（见 `SectionRenderContext.contributed`）。
   *
   * 必须一路传到这里：页面段流走的是本函数自己拼的 ctx，不是 `ssr-render` 里给
   * 页头页脚用的那一份。漏传的表现是那一段**静默不渲染**（渲染器拿不到上下文就
   * 什么都不吐），会员登录页因此曾经是一张空白页。
   */
  contributed?: Readonly<Record<string, unknown>>,
): string {
  const theme = resolveThemeSettings(site.theme_settings);
  const sections = page.sections;
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
    enabledEntitlements,
    contributed,
    ...docContext,
  };
  return sections
    .map((section, index) =>
      renderSectionHtml(section, gaps[index], sectionCtx),
    )
    .join("\n");
}
