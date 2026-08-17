/**
 * 公开事件页 SSR 共用：取 chrome + 模板页（没有就用预设）+ 合成 `renderMarketingHtml`。
 * 与 shop 的 `renderShopTemplatePage` 同构。
 */

import { createEventsPresetTranslator } from "./events-preset-i18n.js";

import { eventsContextEntry } from "../../shared/index.js";

import { resolveSiteAccountEntry } from "@rewindom/builtin/marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "@rewindom/builtin/marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { renderMarketingHtml } from "@rewindom/builtin/marketing/server/ssr-render.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import { withSiteLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";

import { normalizeLocale, type AppLocale } from "@rewindom/module-sdk";

import type { EventsRenderContext } from "../../shared/index.js";
import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import type { SiteSection } from "@rewindom/builtin/marketing/shared/section-schema.js";

export async function renderEventsTemplatePage(input: {
  tenantId: string;
  tenantSlug: string;
  siteName: string;
  origin: string;
  locale: AppLocale;
  kind: string;
  /** 逻辑路径（不带 locale 前缀） */
  path: string;
  preset: PagePreset;
  events: EventsRenderContext;
  title?: string;
  description?: string;
  /**
   * 覆盖版式。查询列表页用：不走租户改过的两段首页，只画与查询匹配的那一段。
   */
  sections?: SiteSection[];
}): Promise<string> {
  const locale = normalizeLocale(input.locale);

  const site = await getSiteChromeOrFallback(
    input.tenantId,
    input.tenantSlug,
    input.siteName,
    locale,
  );
  const stored = input.sections
    ? null
    : await getPublishedTemplatePage(
        input.tenantId,
        input.kind,
        locale,
        { requireSite: false },
      );
  const translate = createEventsPresetTranslator(locale);
  // 记录尚未落库时按内置预设兜底——那是缺口不是产品路径（见 site-section skill）
  const template = input.sections
    ? {
        sections: input.sections,
        title: translate(input.preset.titleKey),
        description: translate(input.preset.descriptionKey),
      }
    : (stored ?? {
        sections: buildPresetSections(input.preset, translate),
        title: translate(input.preset.titleKey),
        description: translate(input.preset.descriptionKey),
      });

  const [accountEntry, entitlements] = await Promise.all([
    resolveSiteAccountEntry({ tenantId: input.tenantId, locale }),
    resolveSectionEntitlements(input.tenantId),
  ]);

  return renderMarketingHtml({
    origin: input.origin,
    site,
    page: {
      slug: input.path,
      locale,
      kind: input.kind,
      title: input.title ?? template.title,
      description: input.description ?? template.description,
      sections: template.sections,
      settings: {},
      visibility: "public",
      path: input.path,
      /*
       * 语言切换候选：事件在各语言下是同一条记录（文案是 locale map），
       * 所以站点开了哪几种语言，这一页就有哪几种。
       */
      alternates: site.available_locales.map((available) => ({
        locale: available,
        path: withSiteLocale(input.path, available, site.default_locale),
      })),
      updated_at: new Date().toISOString(),
    },
    accountEntryHtml: accountEntry.html,
    enabledEntitlements: entitlements,
    contributed: eventsContextEntry(input.events),
  });
}
