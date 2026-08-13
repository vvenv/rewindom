import { DEFAULT_LOCALE } from "@rewindom/module-sdk";

import {
  cartesianOptionCombos,
  optionComboKey,
  suggestVariantSku,
} from "../../shared/product-options.js";

import type {
  CreateShopProductBody,
  ShopProduct,
  ShopProductOption,
  ShopProductStatus,
} from "../../shared/catalog.js";
import type { ShopLocalizedMap } from "../../shared/locale.js";

export interface ProductFormVariant {
  id?: string;
  client_id: string;
  sku: string;
  price_cents: string;
  stock_qty: string;
  weight_g: string;
  hs_code: string;
  origin_country: string;
  option_values: Record<string, string>;
}

export interface ProductFormValues {
  slug: string;
  status: ShopProductStatus;
  title: ShopLocalizedMap;
  description: ShopLocalizedMap;
  options: ShopProductOption[];
  variants: ProductFormVariant[];
}

export function newOptionValue(): ShopProductOption["values"][number] {
  return { id: crypto.randomUUID(), name: {} };
}

export function newOption(): ShopProductOption {
  return {
    id: crypto.randomUUID(),
    name: {},
    values: [newOptionValue()],
  };
}

export function newVariantRow(
  option_values: Record<string, string> = {},
  seed?: Partial<ProductFormVariant>,
): ProductFormVariant {
  return {
    id: seed?.id,
    client_id: seed?.client_id ?? crypto.randomUUID(),
    sku: seed?.sku ?? "",
    price_cents: seed?.price_cents ?? "",
    stock_qty: seed?.stock_qty ?? "0",
    weight_g: seed?.weight_g ?? "0",
    hs_code: seed?.hs_code ?? "",
    origin_country: seed?.origin_country ?? "",
    option_values,
  };
}

export const INITIAL_PRODUCT_FORM: ProductFormValues = {
  slug: "",
  status: "draft",
  title: {},
  description: {},
  options: [],
  variants: [newVariantRow()],
};

export function productToForm(product: ShopProduct): ProductFormValues {
  return {
    slug: product.slug,
    status: product.status,
    title: { ...product.title },
    description: { ...(product.description ?? {}) },
    options: product.options.map((option) => ({
      id: option.id,
      name: { ...option.name },
      values: option.values.map((value) => ({
        id: value.id,
        name: { ...value.name },
      })),
    })),
    variants: product.variants.map((variant) =>
      newVariantRow(variant.option_values, {
        id: variant.id,
        sku: variant.sku,
        price_cents: String(variant.price_cents),
        stock_qty: String(variant.stock_qty),
        weight_g: String(variant.weight_g),
        hs_code: variant.hs_code ?? "",
        origin_country: variant.origin_country ?? "",
      }),
    ),
  };
}

export function syncVariantsToOptions(
  options: ShopProductOption[],
  variants: ProductFormVariant[],
  slug: string,
): ProductFormVariant[] {
  if (options.length === 0) {
    const first = variants[0];
    return [first ? { ...first, option_values: {} } : newVariantRow()];
  }
  const combos = cartesianOptionCombos(options);
  const byKey = new Map(
    variants.map((variant) => [optionComboKey(variant.option_values), variant]),
  );
  const seed = variants[0];
  return combos.map((combo) => {
    const existing = byKey.get(optionComboKey(combo));
    if (existing) return { ...existing, option_values: combo };
    return newVariantRow(combo, {
      sku: suggestVariantSku(slug, options, combo),
      price_cents: seed?.price_cents ?? "",
      stock_qty: seed?.stock_qty ?? "0",
      weight_g: seed?.weight_g ?? "0",
      hs_code: seed?.hs_code ?? "",
      origin_country: seed?.origin_country ?? "",
    });
  });
}

type Translate = (key: string) => string;

export function validateProductForm(
  values: ProductFormValues,
  t: Translate,
): string | null {
  if (!values.title[DEFAULT_LOCALE]?.trim()) return t("validation.titleRequired");
  if (!values.slug.trim()) return t("validation.slugRequired");
  for (const option of values.options) {
    if (!option.name[DEFAULT_LOCALE]?.trim()) return t("validation.optionNameRequired");
    if (option.values.length === 0) return t("validation.optionValueRequired");
    for (const value of option.values) {
      if (!value.name[DEFAULT_LOCALE]?.trim()) {
        return t("validation.optionValueRequired");
      }
    }
  }
  if (values.variants.length === 0) return t("validation.skuRequired");
  for (const variant of values.variants) {
    if (!variant.sku.trim()) return t("validation.skuRequired");
    if (!variant.price_cents.trim() || Number(variant.price_cents) < 1) {
      return t("validation.priceRequired");
    }
  }
  return null;
}

export function buildProductPayload(values: ProductFormValues): CreateShopProductBody {
  const description = Object.fromEntries(
    Object.entries(values.description).filter(([, text]) => text.trim()),
  );
  return {
    slug: values.slug.trim().toLowerCase(),
    status: values.status,
    title: { ...values.title },
    description: Object.keys(description).length > 0 ? description : null,
    options: values.options,
    variants: values.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku.trim(),
      option_values: variant.option_values,
      price_cents: Math.trunc(Number(variant.price_cents)),
      stock_qty: Math.max(0, Math.trunc(Number(variant.stock_qty) || 0)),
      weight_g: Math.max(0, Math.trunc(Number(variant.weight_g) || 0)),
      hs_code: variant.hs_code.trim() || null,
      origin_country: variant.origin_country.trim().toUpperCase() || null,
    })),
  };
}

export function splitCountries(raw: string): string[] {
  return raw
    .split(/[,，\s]+/u)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export function patchLocalized(
  map: ShopLocalizedMap,
  locale: string,
  value: string,
): ShopLocalizedMap {
  return { ...map, [locale]: value };
}
