import { type AppLocale } from "@rewindom/shared";

import {
  buildPresetSections,
  NOT_FOUND_STARTER_PRESET,
  type PresetTranslateFn,
} from "./page-presets.js";
import {
  NOT_FOUND_PAGE_KIND,
  NOT_FOUND_TEMPLATE_SLUG,
} from "./page-templates.js";
import { PAGE_MISSING_SECTION_TYPE } from "./sections/page-missing/definition.js";
import { withSiteLocale } from "./site-locale.js";

import type { SiteSection } from "./section-schema.js";
import type { PublicMarketingPage } from "./site-cms.js";

function hasSectionType(
  sections: readonly SiteSection[],
  type: string,
): boolean {
  for (const section of sections) {
    if (section.type === type) return true;
    for (const block of section.blocks ?? []) {
      if (block.sections && hasSectionType(block.sections, type)) return true;
    }
  }
  return false;
}

/** 未发布 404 模板时，用同一份预设段合成正文。 */
export function buildNotFoundFallbackSections(
  t: PresetTranslateFn,
): SiteSection[] {
  return buildPresetSections(NOT_FOUND_STARTER_PRESET, t);
}

/**
 * 给 `renderMarketingHtml` 用的合成页：套站点 chrome，正文就是预设里那一段。
 * `noindex` 必开——同一张兜底会出现在无数死链上。
 */
export function builtinNotFoundPage(input: {
  locale: AppLocale;
  defaultLocale: AppLocale;
  t: PresetTranslateFn;
}): PublicMarketingPage {
  const path = withSiteLocale("/404", input.locale, input.defaultLocale);
  return {
    slug: NOT_FOUND_TEMPLATE_SLUG,
    locale: input.locale,
    kind: NOT_FOUND_PAGE_KIND,
    title: input.t("preset.not_found.title"),
    description: input.t("preset.not_found.description"),
    sections: buildNotFoundFallbackSections(input.t),
    settings: { noindex: true },
    visibility: "public",
    path: "/404",
    alternates: [{ locale: input.locale, path }],
    updated_at: "1970-01-01T00:00:00.000Z",
  };
}

/**
 * 存量 404 页还没有必备段：整页换成当前预设。
 *
 * 不把旧 hero 的字段搬过来。返回 `null` 表示已经是新形状。
 */
export function upgradeNotFoundSections(
  sections: SiteSection[],
  t: PresetTranslateFn,
): SiteSection[] | null {
  if (hasSectionType(sections, PAGE_MISSING_SECTION_TYPE)) return null;
  return buildNotFoundFallbackSections(t);
}
