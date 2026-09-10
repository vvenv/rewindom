/**
 * `/:slug`。CMS 未命中后再认：已发布的普通页面先赢，对不上再查 thing。
 *
 * 为什么是 fallback 而不是给每一件建一张 CMS 页：详情是按 slug 生成的无数个地址。
 * `/:slug` 不能抢在 CMS 前面，否则「关于」这类自建页会被吃掉。
 *
 * 首页 `/` 不走这里——那是 `kind: home`，由首页版式接管。
 */

import { NotFoundError } from "@rewindom/module-sdk/server";
import { normalizeLocale } from "@rewindom/module-sdk";
import { registerSitePathFallback } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

import { THING_ENTITLEMENT } from "../../shared/entitlements.js";
import { USELESS_THING_TEMPLATE_PRESET } from "../../shared/useless-page-templates.js";
import { USELESS_THING_PAGE_KIND } from "../../shared/sections/thing/definition.js";
import { parseThingSlug, thingPath } from "../../shared/useless-section-context.js";
import { buildUselessThingContext } from "../sections/context.js";
import { renderUselessTemplatePage } from "./useless-page.js";

import type { SitePathHandlerInput } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

async function renderUselessThingFallback(
  input: SitePathHandlerInput,
): Promise<string | null> {
  const slug = parseThingSlug(input.path);
  if (!slug) return null;

  const locale = normalizeLocale(input.locale);
  try {
    const useless = await buildUselessThingContext(
      input.tenantId,
      slug,
      locale,
    );
    const title = useless.thing?.title;
    return renderUselessTemplatePage({
    cspNonce: input.cspNonce,
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      origin: input.origin,
      locale,
      kind: USELESS_THING_PAGE_KIND,
      path: thingPath(slug),
      servedPath: input.servedPath,
      preset: USELESS_THING_TEMPLATE_PRESET,
      useless,
      title: title || undefined,
      request: input,
    });
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

export function registerUselessPathHandler(): void {
  registerSitePathFallback({
    entitlement: THING_ENTITLEMENT.key,
    match: (path) => parseThingSlug(path) !== null,
    render: renderUselessThingFallback,
  });
}
