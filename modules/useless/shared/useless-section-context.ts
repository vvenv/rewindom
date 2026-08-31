/**
 * 无用之物的按请求数据（走 `SectionRenderContext.contributed["useless"]`）。
 *
 * 段渲染器是同步的，东西要查库，所以从 contributed 进。两端各登记一个 provider：
 * SSR 的在 `server/sections/register.ts`，编辑器预览的在 `client/editor-context.ts`。
 * 只登记一边的后果是「预览空白」或「实站不渲染」。
 *
 * 首页喂 `things`；详情页喂当前那一件 `thing`。key 只有一个，渲染器各取各的。
 */
import { isReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";
import { SITE_INTERPOLATION_KEY } from "@rewindom/builtin/marketing/shared/site-interpolation.js";
import {
  siteLocaleOrder,
  withSiteLocale,
} from "@rewindom/builtin/marketing/shared/site-locale.js";

import type { ThingKind } from "./thing.js";
import type { SectionRenderContext } from "@rewindom/builtin/marketing/shared/sections/render-context.js";
import type { PageLocaleAlternate } from "@rewindom/builtin/marketing/shared/site-cms.js";
import type { AppLocale } from "@rewindom/module-sdk";

export const USELESS_CONTEXT_KEY = "useless";

export const USELESS_INDEX_PATH = "/";
export const USELESS_THING_PATH = "/:slug";

export function thingPath(slug: string): string {
  return `/${encodeURIComponent(slug)}`;
}

/**
 * `/:slug` → slug。`/`、多段、保留字（`app` / `login` / locale…）都不是详情。
 *
 * 匹配的是剥掉 locale 前缀后的逻辑路径，所以 `/en/一口气` 与 `/一口气` 同一条。
 */
export function parseThingSlug(path: string): string | null {
  if (!path.startsWith("/") || path === "/") return null;
  const rest = path.slice(1);
  if (!rest || rest.includes("/")) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(rest);
  } catch {
    return null;
  }
  if (!slug || isReservedPageSlug(slug)) return null;
  return slug;
}

export interface UselessThingView {
  kind: ThingKind;
  slug: string;
  href: string;
  title: string;
  text: string;
  html: string;
  thumbnail: string;
}

/**
 * 已经落成当前语言的**成品文案**。
 *
 * 渲染器是同步的、拿不到 i18n，所以这些字由服务端 provider 按 `input.locale` 解好
 * 再送进来——与 newsletter 的 `NewsletterSectionLabels` 同一条口径。
 */
export interface UselessLabels {
  /** 池子空时的库存句；租户在段里填了 `empty_text` 就用租户的。 */
  empty: string;
}

export interface UselessRenderContext {
  things: readonly UselessThingView[];
  /** 详情页当前这一件。首页为 null。 */
  thing: UselessThingView | null;
  labels: UselessLabels;
}

const EMPTY_CONTEXT: UselessRenderContext = {
  things: [],
  thing: null,
  labels: { empty: "" },
};

export function emptyUselessContext(
  overrides: Partial<UselessRenderContext> = {},
): UselessRenderContext {
  return { ...EMPTY_CONTEXT, ...overrides };
}

export function uselessInterpolationValues(
  context: UselessRenderContext,
): Record<string, string> {
  return { thing: context.thing?.title ?? "" };
}

export function uselessContextEntry(
  context: UselessRenderContext,
): Record<string, unknown> {
  return {
    [USELESS_CONTEXT_KEY]: context,
    [SITE_INTERPOLATION_KEY]: uselessInterpolationValues(context),
  };
}

export function readUselessContext(input: {
  contributed?: SectionRenderContext["contributed"];
}): UselessRenderContext | null {
  const value = input.contributed?.[USELESS_CONTEXT_KEY];
  if (!value || typeof value !== "object") return null;
  return value as UselessRenderContext;
}

export function uselessStorefrontAlternates(input: {
  path: string;
  locales: readonly AppLocale[];
  defaultLocale: AppLocale;
  current: AppLocale;
}): PageLocaleAlternate[] {
  const wanted = new Set(input.locales);
  wanted.add(input.current);
  const locales = siteLocaleOrder(input.defaultLocale).filter((locale) =>
    wanted.has(locale),
  );
  const seen = new Set<AppLocale>();
  const out: PageLocaleAlternate[] = [];
  for (const locale of locales) {
    if (seen.has(locale)) continue;
    seen.add(locale);
    out.push({
      locale,
      path: withSiteLocale(input.path, locale, input.defaultLocale),
    });
  }
  return out;
}
