/**
 * 公开事件页 SSR 共用：取 chrome + 模板页（没有就用预设）+ 合成 `renderMarketingHtml`。
 * 与 shop 的 `renderShopTemplatePage` 同构。
 */

import { createEventsPresetTranslator } from "./events-preset-i18n.js";

import { getEnabledTopics } from "../event/topic-settings.service.js";

import { eventsContextEntry } from "../../shared/index.js";
import { withEventsNavTopics } from "../../shared/nav-sources.js";

import { resolveSiteAccountEntry } from "@rewindom/builtin/marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "@rewindom/builtin/marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { renderMarketingHtml } from "@rewindom/builtin/marketing/server/ssr-render.js";
import { escapeHtml } from "@rewindom/builtin/marketing/shared/html.js";
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
  /** 实际对外地址；把本页设为首页时为 `/`。 */
  servedPath?: string;
  preset: PagePreset;
  events: EventsRenderContext;
  title?: string;
  description?: string;
  /**
   * 覆盖版式。查询列表页用：不走租户改过的两段首页，只画与查询匹配的那一段。
   */
  sections?: SiteSection[];
  /**
   * 这一页专属的社交卡片图（绝对 URL）。不传则回落站点品牌图。
   *
   * 详情页在卡片图不可用时（服务端没有字体）刻意不传——回落一张能看的图，
   * 好过指向一个 404 的图片地址。
   */
  ogImage?: string;
  /** `?source=` 过滤列表：canonical 已指向不带查询的地址，这页本身不该被收录。 */
  noindex?: boolean;
  /** 内容不是译文时不发 hreflang 互指（语言切换器仍列出各 UI 语言）。 */
  omitHreflang?: boolean;
  /** 覆盖 canonical 的逻辑路径（默认语言、无前缀）。 */
  canonicalPath?: string;
  /** 主题 / 过滤列表没有 page-header 段，需要一颗可见 h1。 */
  leadHeading?: boolean;
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

  const [accountEntry, entitlements, enabledTopics] = await Promise.all([
    resolveSiteAccountEntry({ tenantId: input.tenantId, locale }),
    resolveSectionEntitlements(input.tenantId),
    getEnabledTopics(input.tenantId),
  ]);

  const title = input.title ?? template.title;
  const description = input.description || template.description || undefined;

  return renderMarketingHtml({
    origin: input.origin,
    site,
    page: {
      slug: input.path,
      locale,
      kind: input.kind,
      title,
      description: description ?? "",
      sections: template.sections,
      settings: {
        ...(input.ogImage ? { og_image: input.ogImage } : {}),
        ...(input.noindex ? { noindex: true } : {}),
      },
      visibility: "public",
      path: input.path,
      /*
       * 语言切换器仍列出站点开了的每一种 UI 语言。事件正文不是译文
       * （见 MODULE.md「不做翻译」），hreflang 互指由 omitHreflang 关掉。
       */
      alternates: site.available_locales.map((available) => ({
        locale: available,
        path: withSiteLocale(input.path, available, site.default_locale),
      })),
      updated_at: new Date().toISOString(),
    },
    accountEntryHtml: accountEntry.html,
    enabledEntitlements: entitlements,
    contributed: eventsContextEntry(
      withEventsNavTopics(input.events, locale, enabledTopics),
    ),
    servedPath: input.servedPath,
    omitHreflang: input.omitHreflang,
    canonicalPath: input.canonicalPath,
    leadHtml: input.leadHeading
      ? `<h1 class="page-title">${escapeHtml(title)}</h1>`
      : undefined,
  });
}
