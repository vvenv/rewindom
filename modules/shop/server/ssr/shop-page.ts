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
import { SHOP_CONTEXT_SECTION_TYPES } from "../../shared/section-types.js";

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
import type { PagePreset } from "@rewindom/builtin/marketing/shared/page-presets.types.js";
import { normalizeLocale, type AppLocale } from "@rewindom/module-sdk";

export async function renderShopTemplatePage(input: {
  tenantId: string;
  /** 本次响应的 CSP nonce，透传给 renderMarketingHtml（见 SitePathHandlerInput）。 */
  cspNonce?: string;
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
  /** 页头页脚上别的模块的块要用（购物车 cookie 之外的那些）。 */
  cookies?: { get(name: string): string | undefined };
  query?: Readonly<Record<string, unknown>>;
  memberId?: string | null;
  /** path handler 的输入里本来就有；自挂路由的那几条不传，下面自己解析。 */
  homePath?: string;
  homeLayoutKey?: string;
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

  /*
   * 页头页脚上的贡献块与 CMS 页一条口径（见 `marketing/server/page-contributed.ts`）：
   * 不跑这一步，店面页的页头就只剩兜底——事件主题格会把租户关掉的格子也挂出来。
   *
   * **跳过店铺自己那组 type**：这张页手上已经带着完整的购物车、商品与分类树
   * （`input.shop`），provider 再查一遍是白打一轮库，而且 `ShopRenderContext` 是
   * 满形状对象，自己这份的空值本来就会盖掉 provider 那份。
   */
  const home =
    input.homePath === undefined
      ? await resolveVisitorHomePath({
          tenantId: input.tenantId,
          path: input.path,
          entitlements,
        })
      : { homePath: input.homePath, homeLayoutKey: input.homeLayoutKey };
  const contributed = await resolvePageContributed({
    tenantId: input.tenantId,
    locale,
    defaultLocale: site.default_locale,
    site,
    sections: template.sections,
    own: shopContextEntry(shop),
    skipSectionTypes: SHOP_CONTEXT_SECTION_TYPES,
    cookies: input.cookies,
    query: input.query,
    memberId: input.memberId,
    homePath: home.homePath,
    homeLayoutKey: home.homeLayoutKey,
  });

  return renderMarketingHtml({
    cspNonce: input.cspNonce,
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
    contributed,
    servedPath: input.servedPath,
  });
}
