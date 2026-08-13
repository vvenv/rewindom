import { DEFAULT_LOCALE, type AppLocale } from "@rewindom/module-sdk";

import { resolveShopLocaleText, type ShopLocalizedMap } from "./locale.js";

import type { ShopProductOption, ShopVariant } from "./catalog.js";

export const SHOP_MAX_OPTIONS = 3;
export const SHOP_MAX_OPTION_VALUES = 50;

export function emptyOptionValues(): Record<string, string> {
  return {};
}

export function optionComboKey(option_values: Record<string, string>): string {
  return Object.keys(option_values)
    .sort()
    .map((optionId) => `${optionId}:${option_values[optionId] ?? ""}`)
    .join("|");
}

export function cartesianOptionCombos(
  options: ShopProductOption[],
): Record<string, string>[] {
  if (options.length === 0) return [emptyOptionValues()];
  return options.reduce<Record<string, string>[]>((combos, option) => {
    if (option.values.length === 0) return combos;
    const next: Record<string, string>[] = [];
    const bases = combos.length > 0 ? combos : [emptyOptionValues()];
    for (const base of bases) {
      for (const value of option.values) {
        next.push({ ...base, [option.id]: value.id });
      }
    }
    return next;
  }, []);
}

export function composeVariantLabel(
  options: ShopProductOption[],
  option_values: Record<string, string>,
  locale: AppLocale,
): string {
  return options
    .map((option) => {
      const value = option.values.find(
        (item) => item.id === option_values[option.id],
      );
      return resolveShopLocaleText(value?.name, locale);
    })
    .filter(Boolean)
    .join(" / ");
}

export function variantStorefrontLabel(
  options: ShopProductOption[],
  variant: Pick<ShopVariant, "sku" | "title" | "option_values">,
  locale: AppLocale,
): string {
  if (options.length > 0) {
    return (
      composeVariantLabel(options, variant.option_values, locale) || variant.sku
    );
  }
  return resolveShopLocaleText(variant.title, locale) || variant.sku;
}

export function suggestVariantSku(
  slug: string,
  options: ShopProductOption[],
  option_values: Record<string, string>,
): string {
  const base = slug.trim().toLowerCase() || "sku";
  if (options.length === 0) return base;
  const parts = options.map((option) => {
    const value = option.values.find(
      (item) => item.id === option_values[option.id],
    );
    const name = resolveShopLocaleText(value?.name, DEFAULT_LOCALE);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 12);
    return slug || value?.id.replace(/[^a-z0-9]/giu, "").slice(0, 8) || "opt";
  });
  const suffix = parts.filter(Boolean).join("-");
  return suffix ? `${base}-${suffix}`.slice(0, 64) : base;
}

export function isShopLocalizedName(value: unknown): value is ShopLocalizedMap {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.values(value).every((item) => typeof item === "string"),
  );
}

export function readShopOptions(value: unknown): ShopProductOption[] {
  if (!Array.isArray(value)) return [];
  const options: ShopProductOption[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || !record.id.trim()) continue;
    if (!isShopLocalizedName(record.name)) continue;
    if (!Array.isArray(record.values)) continue;
    const values = record.values.flatMap((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
      const row = raw as Record<string, unknown>;
      if (typeof row.id !== "string" || !row.id.trim()) return [];
      if (!isShopLocalizedName(row.name)) return [];
      return [{ id: row.id, name: row.name }];
    });
    options.push({ id: record.id, name: record.name, values });
  }
  return options;
}

export function readOptionValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyOptionValues();
  }
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim()) out[key] = item;
  }
  return out;
}
