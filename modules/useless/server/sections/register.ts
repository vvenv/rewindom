/**
 * 往「站点」的注册表里填本模块的贡献（SSR 侧）。
 *
 * 定义与 HTML 渲染器都住在 `shared/`，两端 import 同一份——marketing 只提供注册表，
 * 不认识 `useless.*`。**每一项在 client manifest 那边还要再登记一次**。
 */
import "../ssr/useless-preset-i18n.js";

import { registerSectionContextProvider } from "@rewindom/builtin/marketing/server/section-context-providers.js";
import { registerSitemapProvider } from "@rewindom/builtin/marketing/server/sitemap-providers.js";
import { registerSiteSectionHtml } from "@rewindom/builtin/marketing/shared/sections/html.js";
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { isUselessEnabled } from "../lib/entitlement.js";
import { USELESS_CONTEXT_SECTION_TYPES } from "../../shared/section-types.js";
import { uselessListSection } from "../../shared/sections/list/definition.js";
import { renderUselessListHtml } from "../../shared/sections/list/html.js";
import { uselessThingSection } from "../../shared/sections/thing/definition.js";
import { renderUselessThingHtml } from "../../shared/sections/thing/html.js";
import { USELESS_CSS } from "../../shared/site-css.generated.js";
import {
  thingPath,
  uselessContextEntry,
} from "../../shared/useless-section-context.js";
import { registerUselessPageTemplates } from "../../shared/useless-page-templates.js";
import { buildUselessListContext } from "./context.js";
import { registerUselessPathHandler } from "../ssr/useless-path-handler.js";

const css = { css: USELESS_CSS };

async function getUselessSitemapEntries(tenantId: string) {
  if (!(await isUselessEnabled(tenantId))) return [];
  const records = await prisma.thing.findMany({
    where: withTenantScope(tenantId, { enabled: true }),
    select: { slug: true, updated_at: true },
    orderBy: { created_at: "desc" },
  });
  return records.map((row) => {
    const path = thingPath(row.slug);
    return {
      path,
      updated_at: row.updated_at.toISOString(),
      alternates: [{ locale: "zh-CN" as const, path }],
    };
  });
}

/** 在模块 `onBoot` 里调。 */
export function registerUselessSiteContributions(): void {
  registerUselessPageTemplates();
  registerSiteSectionHtml(uselessListSection, renderUselessListHtml, css);
  registerSiteSectionHtml(uselessThingSection, renderUselessThingHtml, css);
  registerUselessPathHandler();

  registerSectionContextProvider({
    sectionTypes: [...USELESS_CONTEXT_SECTION_TYPES],
    provide: async (input) => {
      if (!(await isUselessEnabled(input.tenantId))) return {};
      const context = await buildUselessListContext(
        input.tenantId,
        input.locale,
      );
      return uselessContextEntry(context);
    },
  });

  registerSitemapProvider({
    provide: getUselessSitemapEntries,
  });
}
