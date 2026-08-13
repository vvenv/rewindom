/**
 * 自定义 page slug 的第一段不可占用的保留字。
 *
 * 内核只收**部署拓扑**占掉的一级路径（locale、应用区、`SITE_APP_PREFIXES`）。
 * 文档库那种「CMS 内容前缀」由模块 `registerReservedPageSlug` 登记——没装
 * `site-docs` 时租户可以建一张叫 `docs` 的普通页。
 */

import { APP_LOCALES } from "@rewindom/shared";

import { SITE_APP_PREFIXES } from "./site-app-prefixes.js";

const KERNEL_RESERVED = new Set<string>([
  ...APP_LOCALES.map((locale) => locale.slug.toLowerCase()),
  "home",
  ...SITE_APP_PREFIXES,
  "sitemap.xml",
  "robots.txt",
]);

const CONTRIBUTED = new Set<string>();

export function registerReservedPageSlug(slug: string): void {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    throw new Error("site.reserved_slug_empty");
  }
  CONTRIBUTED.add(normalized);
}

export function resetReservedPageSlugContributions(): void {
  CONTRIBUTED.clear();
}

export function getReservedPageSlugs(): ReadonlySet<string> {
  if (CONTRIBUTED.size === 0) return KERNEL_RESERVED;
  return new Set([...KERNEL_RESERVED, ...CONTRIBUTED]);
}

export function isReservedPageSlug(slug: string): boolean {
  return getReservedPageSlugs().has(slug.trim().toLowerCase());
}

/** 内核保留字（不含贡献项）。读全表请用 `getReservedPageSlugs`。 */
export const RESERVED_PAGE_SLUGS: ReadonlySet<string> = KERNEL_RESERVED;
