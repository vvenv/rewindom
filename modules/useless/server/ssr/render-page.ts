/**
 * 把「某个东西」渲染成一整张站点页面。
 *
 * `/20260826`（回看）与中台预览共用这一份：两边看到的必须是同一个东西，否则
 * 预览就没有意义了。差别只在**上下文从哪来**——回看按日期查，预览按 id 指定。
 */
import { resolveSectionContexts } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { resolveSiteAccountEntry } from "@rewindom/builtin/marketing/server/site-account-entry.js";
import { resolveSectionEntitlements } from "@rewindom/builtin/marketing/server/site-entitlements.js";
import {
  getPublishedPublicPage,
  getSiteChromeOrFallback,
} from "@rewindom/builtin/marketing/server/site.service.js";
import { renderMarketingHtml } from "@rewindom/builtin/marketing/server/ssr-render.js";
import { collectSectionTypes } from "@rewindom/builtin/marketing/shared/sections/collect-types.js";
import { normalizeLocale, type AppLocale } from "@rewindom/module-sdk";

import { USELESS_TODAY_SECTION_TYPE } from "../../shared/sections/today/definition.js";
import { uselessContextEntry } from "../../shared/useless-section-context.js";

import type { UselessRenderContext } from "../../shared/useless-section-context.js";

export interface RenderUselessPageInput {
  tenantId: string;
  tenantSlug: string;
  origin: string;
  locale: AppLocale | null;
  /** 出现在 canonical / 地址栏上的路径。预览用一个假路径即可。 */
  path: string;
  /** 已经算好的上下文；不给则让 provider 自己按 query 算（回看那条路）。 */
  context?: UselessRenderContext;
  query?: Record<string, string>;
  accountEntryHtml?: string;
  cookies?: { get(name: string): string | undefined };
  homePath?: string;
  homeLayoutKey?: string;
}

/** 首页没发布、或首页上没摆这个段时返回 null。 */
export async function renderUselessPage(
  input: RenderUselessPageInput,
): Promise<string | null> {
  const chrome = await getSiteChromeOrFallback(
    input.tenantId,
    input.tenantSlug,
    input.tenantSlug,
    input.locale,
  );
  const locale = normalizeLocale(input.locale, chrome.default_locale);

  const home = await getPublishedPublicPage(
    input.tenantId,
    "/",
    input.tenantSlug,
    locale,
  );
  if (!home) return null;

  const usedSectionTypes = collectSectionTypes(home.site.header);
  collectSectionTypes(home.site.footer, usedSectionTypes);
  collectSectionTypes(home.page.sections, usedSectionTypes);
  if (!usedSectionTypes.has(USELESS_TODAY_SECTION_TYPE)) return null;

  const [entitlements, resolved, accountEntry] = await Promise.all([
    resolveSectionEntitlements(input.tenantId),
    resolveSectionContexts({
      tenantId: input.tenantId,
      locale,
      defaultLocale: home.site.default_locale,
      usedSectionTypes,
      cookies: input.cookies,
      query: input.query ?? {},
      homePath: input.homePath,
      homeLayoutKey: input.homeLayoutKey,
    }),
    input.accountEntryHtml === undefined
      ? resolveSiteAccountEntry({ tenantId: input.tenantId, locale })
      : Promise.resolve(null),
  ]);

  /*
   * 指定了上下文就**盖掉** provider 算出来的那份（预览：看这一个，不看今天）。
   * 按键合并，页头页脚上别的模块贡献的上下文要留着。
   */
  const contributed = input.context
    ? { ...(resolved ?? {}), ...uselessContextEntry(input.context) }
    : resolved;

  return renderMarketingHtml({
    origin: input.origin,
    tenant_id: input.tenantId,
    tenant_slug: input.tenantSlug,
    site: home.site,
    contributed,
    page: {
      ...home.page,
      slug: input.path,
      path: input.path,
      // 回看是同一张页的切片，预览根本不该被看到——两者都不收录
      settings: { ...(home.page.settings ?? {}), noindex: true },
    },
    accountEntryHtml: input.accountEntryHtml ?? accountEntry?.html ?? "",
    enabledEntitlements: entitlements,
  });
}
