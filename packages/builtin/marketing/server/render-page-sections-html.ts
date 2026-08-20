/**
 * 把已发布页的 sections 渲成 main 内层 HTML（SSR 与会员 page-html 共用）。
 */

import { normalizeLocale } from "@rewindom/shared";

import {
  resolveSectionGaps,
  resolveSectionLayout,
} from "../shared/section-schema.js";
import { renderSectionHtml } from "../shared/sections/html.js";
import {
  resolveThemeSettings,
  THEME_SECTION_SPACING,
} from "../shared/theme-sections.js";

import type {
  PublicMarketingPage,
  PublicMarketingSite,
} from "../shared/site-cms.js";

export interface RenderPageSectionsOptions {
  /**
   * 本租户已开通的 entitlement；贡献段据此决定渲不渲染（见 `site-entitlements.ts`）。
   * 不传等于一个贡献段都不出——少了而不是多了，这个方向是安全的。
   */
  enabledEntitlements?: ReadonlySet<string>;
  /**
   * 贡献段的按请求数据（见 `SectionRenderContext.contributed`）。
   *
   * 必须一路传到这里：页面段流走的是本函数自己拼的 ctx，不是 `ssr-render` 里给
   * 页头页脚用的那一份。漏传的表现是那一段**静默不渲染**（渲染器拿不到上下文就
   * 什么都不吐），会员登录页因此曾经是一张空白页。
   */
  contributed?: Readonly<Record<string, unknown>>;
  /**
   * 声明了 `default_tenant_only` 的段据此决定渲不渲染。
   *
   * 与 `contributed` 同病：页头页脚走 `ssr-render` 自己那份 ctx，页面正文走这里。
   * 漏传按 false 算——平台套餐区（`billing.plans`）会在产品站上也整段消失，
   * 编辑器预览却正常（React 视图不走这条闸门）。
   */
  isDefaultTenant?: boolean;
  /**
   * 本次渲染的 `{token}` 值表（见 `SectionRenderContext.interpolation`）。
   *
   * 与 `contributed` 同病：漏传不会报错，只是段里的 `{site}` / `{tagline}` 原样
   * 吐给访客。调用方手上有站点对象与请求 origin，算一次传下来即可。
   */
  interpolation?: Record<string, string>;
}

export function renderPageSectionsHtml(
  site: PublicMarketingSite,
  page: PublicMarketingPage,
  options: RenderPageSectionsOptions = {},
): string {
  const { enabledEntitlements, contributed, isDefaultTenant, interpolation } =
    options;
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
    isDefaultTenant,
    interpolation,
  };
  return sections
    .map((section, index) =>
      renderSectionHtml(section, gaps[index], sectionCtx),
    )
    .join("\n");
}
