/**
 * 店面 SSR 共用：取 chrome + 模板页（没有就用预设）+ 合成 `renderMarketingHtml`。
 */

import { createShopPresetTranslator } from "./shop-preset-i18n.js";
import { listPublishedCollections } from "../catalog/collection.service.js";
import { toCollectionCard } from "./shop-view.js";
import {
  shopContextEntry,
  shopStorefrontAlternates,
  type ShopRenderContext,
} from "../../shared/shop-section-context.js";

import { resolveSiteAccountEntry } from "@rewindom/builtin/marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "@rewindom/builtin/marketing/server/site-entitlements.js";
import {
  getPublishedTemplatePage,
  getSiteChromeOrFallback,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { renderMarketingHtml } from "@rewindom/builtin/marketing/server/ssr-render.js";
import { buildPresetSections } from "@rewindom/builtin/marketing/shared/page-presets.js";
import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import { normalizeLocale, type AppLocale } from "@rewindom/module-sdk";

export async function renderShopTemplatePage(input: {
  tenantId: string;
  tenantSlug: string;
  siteName: string;
  origin: string;
  locale: AppLocale;
  kind: string;
  path: string;
  /** 实际对外地址；把本页设为首页时为 `/`。 */
  servedPath?: string;
  preset: PagePreset;
  shop: ShopRenderContext;
  title?: string;
  description?: string;
  noindex?: boolean;
}): Promise<string> {
  const locale = normalizeLocale(input.locale);
  const collections =
    input.shop.collections.length > 0
      ? input.shop.collections
      : (await listPublishedCollections(input.tenantId)).map((row) =>
          toCollectionCard(row, locale),
        );
  const shop = { ...input.shop, collections };
  const site = await getSiteChromeOrFallback(
    input.tenantId,
    input.tenantSlug,
    input.siteName,
    locale,
  );
  const stored = await getPublishedTemplatePage(
    input.tenantId,
    input.kind,
    locale,
    { requireSite: false },
  );
  const translate = createShopPresetTranslator(locale);
  const template = stored ?? {
    sections: buildPresetSections(input.preset, translate),
    title: translate(input.preset.titleKey),
    description: translate(input.preset.descriptionKey),
  };

  const [accountEntry, entitlements] = await Promise.all([
    resolveSiteAccountEntry({ tenantId: input.tenantId, locale }),
    resolveSectionEntitlements(input.tenantId),
  ]);

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
      alternates: shopStorefrontAlternates({
        path: input.path,
        locales: site.available_locales,
        defaultLocale: site.default_locale,
        current: locale,
        noindex: input.noindex,
      }),
      updated_at: new Date().toISOString(),
    },
    accountEntryHtml: accountEntry.html,
    enabledEntitlements: entitlements,
    contributed: shopContextEntry(shop),
    servedPath: input.servedPath,
  });
}
