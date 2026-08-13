import type { AppLocale } from "@rewindom/module-sdk";

/** 扁平 locale → 文案。缺当前语言时回落 zh-CN，再回落任意非空值。 */
export type ShopLocalizedMap = Record<string, string>;

export function isShopLocalizedMap(value: unknown): value is ShopLocalizedMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((item) => typeof item === "string");
}

export function resolveShopLocaleText(
  value: unknown,
  locale: AppLocale,
  fallback = "",
): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (!isShopLocalizedMap(value)) return fallback;
  const direct = value[locale]?.trim();
  if (direct) return direct;
  const zh = value["zh-CN"]?.trim();
  if (zh) return zh;
  const en = value.en?.trim();
  if (en) return en;
  const first = Object.values(value).find((item) => item.trim());
  return first?.trim() || fallback;
}

export function toShopLocalizedMap(
  value: unknown,
  locale: AppLocale,
): ShopLocalizedMap {
  if (isShopLocalizedMap(value)) return { ...value };
  if (typeof value === "string" && value.trim()) {
    return { [locale]: value.trim() };
  }
  return {};
}
