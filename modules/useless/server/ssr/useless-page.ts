/**
 * 无用之物 SSR 共用：取 chrome + 模板页（没有就用预设）+ 合成 `renderMarketingHtml`。
 * 与 shop 的 `renderShopTemplatePage`、events 的 `renderEventsTemplatePage` 同构。
 */

import "../ssr/useless-preset-i18n.js";

import { createUselessPresetTranslator } from "./useless-preset-i18n.js";
import { USELESS_CONTEXT_SECTION_TYPES } from "../../shared/section-types.js";
import {
  uselessContextEntry,
  uselessStorefrontAlternates,
  type UselessRenderContext,
} from "../../shared/useless-section-context.js";

import { resolvePageContributed } from "@rewindom/builtin/marketing/server/page-contributed.js";
import { resolveSiteAccountEntry } from "@rewindom/builtin/marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "@rewindom/builtin/marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
  resolveVisitorHomePath,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { renderMarketingHtml } from "@rewindom/builtin/marketing/server/ssr-render.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import { normalizeLocale, type AppLocale } from "@rewindom/module-sdk";

import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import type { SitePathHandlerInput } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

export async function renderUselessTemplatePage(input: {
  tenantId: string;
  tenantSlug: string;
  origin: string;
  locale: AppLocale;
  kind: string;
  path: string;
  servedPath?: string;
  preset: PagePreset;
  useless: UselessRenderContext;
  title?: string;
  description?: string;
  noindex?: boolean;
  request?: Pick<
    SitePathHandlerInput,
    "cookies" | "query" | "homePath" | "homeLayoutKey"
  >;
}): Promise<string> {
  const locale = normalizeLocale(input.locale);
  const site = await getSiteChromeOrFallback(
    input.tenantId,
    input.tenantSlug,
    input.tenantSlug,
    locale,
  );
  const stored = await getPublishedTemplatePage(
    input.tenantId,
    input.kind,
    locale,
    { requireSite: false },
  );
  const translate = createUselessPresetTranslator(locale);
  const template = stored ?? {
    sections: buildPresetSections(input.preset, translate),
    title: translate(input.preset.titleKey),
    description: translate(input.preset.descriptionKey),
  };

  const [accountEntry, entitlements] = await Promise.all([
    resolveSiteAccountEntry({ tenantId: input.tenantId, locale }),
    resolveSectionEntitlements(input.tenantId),
  ]);

  const home =
    input.request?.homePath === undefined
      ? await resolveVisitorHomePath({
          tenantId: input.tenantId,
          path: input.path,
          entitlements,
        })
      : {
          homePath: input.request.homePath,
          homeLayoutKey: input.request.homeLayoutKey,
        };

  const contributed = await resolvePageContributed({
    tenantId: input.tenantId,
    locale,
    defaultLocale: site.default_locale,
    site,
    sections: template.sections,
    own: uselessContextEntry(input.useless),
    skipSectionTypes: USELESS_CONTEXT_SECTION_TYPES,
    cookies: input.request?.cookies,
    query: input.request?.query,
    homePath: home.homePath,
    homeLayoutKey: home.homeLayoutKey,
  });

  return renderMarketingHtml({
    origin: input.origin,
    tenant_id: input.tenantId,
    tenant_slug: input.tenantSlug,
    site,
    page: {
      slug: input.path,
      locale,
      kind: input.kind,
      title: input.title ?? template.title,
      description: input.description ?? template.description,
      sections: template.sections,
      settings: input.noindex ? { noindex: true } : {},
      visibility: "public",
      path: input.path,
      alternates: uselessStorefrontAlternates({
        path: input.path,
        locales: site.available_locales,
        defaultLocale: site.default_locale,
        current: locale,
      }),
      updated_at: new Date().toISOString(),
    },
    accountEntryHtml: accountEntry.html,
    enabledEntitlements: entitlements,
    contributed,
    servedPath: input.servedPath,
  });
}
