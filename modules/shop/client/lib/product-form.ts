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
} from "../../shared/catalog.js";
import type {
  ShopInventoryPolicy,
  ShopProductImage,
  ShopProductStatus,
} from "../../shared/product-commerce.js";
import type { ShopLocalizedMap } from "../../shared/locale.js";
import { SHOP_INVENTORY_POLICIES } from "../../shared/product-commerce.js";

export interface ProductFormVariant {
  id?: string;
  client_id: string;
  sku: string;
  price_cents: string;
  compare_at_price_cents: string;
  stock_qty: string;
  weight_g: string;
  barcode: string;
  hs_code: string;
  origin_country: string;
  inventory_policy: ShopInventoryPolicy;
  track_inventory: boolean;
  requires_shipping: boolean;
  taxable: boolean;
  option_values: Record<string, string>;
}

export interface ProductFormValues {
  slug: string;
  status: ShopProductStatus;
  title: ShopLocalizedMap;
  subtitle: ShopLocalizedMap;
  description: ShopLocalizedMap;
  images: ShopProductImage[];
  product_type: string;
  vendor: string;
  tags: string;
  seo_title: ShopLocalizedMap;
  seo_description: ShopLocalizedMap;
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

export function newImage(url = ""): ShopProductImage {
  return { id: crypto.randomUUID(), url, alt: {} };
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
    compare_at_price_cents: seed?.compare_at_price_cents ?? "",
    stock_qty: seed?.stock_qty ?? "0",
    weight_g: seed?.weight_g ?? "0",
    barcode: seed?.barcode ?? "",
    hs_code: seed?.hs_code ?? "",
    origin_country: seed?.origin_country ?? "",
    inventory_policy: seed?.inventory_policy ?? "deny",
    track_inventory: seed?.track_inventory ?? true,
    requires_shipping: seed?.requires_shipping ?? true,
    taxable: seed?.taxable ?? true,
    option_values,
  };
}

export const INITIAL_PRODUCT_FORM: ProductFormValues = {
  slug: "",
  status: "draft",
  title: {},
  subtitle: {},
  description: {},
  images: [],
  product_type: "",
  vendor: "",
  tags: "",
  seo_title: {},
  seo_description: {},
  options: [],
  variants: [newVariantRow()],
};

export function productToForm(product: ShopProduct): ProductFormValues {
  return {
    slug: product.slug,
    status: product.status,
    title: { ...product.title },
    subtitle: { ...(product.subtitle ?? {}) },
    description: { ...(product.description ?? {}) },
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: { ...image.alt },
    })),
    product_type: product.product_type ?? "",
    vendor: product.vendor ?? "",
    tags: product.tags.join(", "),
    seo_title: { ...(product.seo_title ?? {}) },
    seo_description: { ...(product.seo_description ?? {}) },
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
        compare_at_price_cents:
          variant.compare_at_price_cents != null
            ? String(variant.compare_at_price_cents)
            : "",
        stock_qty: String(variant.stock_qty),
        weight_g: String(variant.weight_g),
        barcode: variant.barcode ?? "",
        hs_code: variant.hs_code ?? "",
        origin_country: variant.origin_country ?? "",
        inventory_policy: variant.inventory_policy,
        track_inventory: variant.track_inventory,
        requires_shipping: variant.requires_shipping,
        taxable: variant.taxable,
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
      compare_at_price_cents: seed?.compare_at_price_cents ?? "",
      stock_qty: seed?.stock_qty ?? "0",
      weight_g: seed?.weight_g ?? "0",
      barcode: seed?.barcode ?? "",
      hs_code: seed?.hs_code ?? "",
      origin_country: seed?.origin_country ?? "",
      inventory_policy: seed?.inventory_policy ?? "deny",
      track_inventory: seed?.track_inventory ?? true,
      requires_shipping: seed?.requires_shipping ?? true,
      taxable: seed?.taxable ?? true,
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
    if (!SHOP_INVENTORY_POLICIES.includes(variant.inventory_policy)) {
      return t("validation.inventoryPolicy");
    }
  }
  return null;
}

function compactLocalized(map: ShopLocalizedMap): ShopLocalizedMap | null {
  const next = Object.fromEntries(
    Object.entries(map).filter(([, text]) => text.trim()),
  );
  return Object.keys(next).length > 0 ? next : null;
}

export function buildProductPayload(values: ProductFormValues): CreateShopProductBody {
  return {
    slug: values.slug.trim().toLowerCase(),
    status: values.status,
    title: { ...values.title },
    subtitle: compactLocalized(values.subtitle),
    description: compactLocalized(values.description),
    images: values.images.filter((image) => image.url.trim()),
    product_type: values.product_type.trim() || null,
    vendor: values.vendor.trim() || null,
    tags: values.tags,
    seo_title: compactLocalized(values.seo_title),
    seo_description: compactLocalized(values.seo_description),
    options: values.options,
    variants: values.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku.trim(),
      option_values: variant.option_values,
      price_cents: Math.trunc(Number(variant.price_cents)),
      compare_at_price_cents: variant.compare_at_price_cents.trim()
        ? Math.trunc(Number(variant.compare_at_price_cents))
        : null,
      stock_qty: Math.max(0, Math.trunc(Number(variant.stock_qty) || 0)),
      weight_g: Math.max(0, Math.trunc(Number(variant.weight_g) || 0)),
      barcode: variant.barcode.trim() || null,
      hs_code: variant.hs_code.trim() || null,
      origin_country: variant.origin_country.trim().toUpperCase() || null,
      inventory_policy: variant.inventory_policy,
      track_inventory: variant.track_inventory,
      requires_shipping: variant.requires_shipping,
      taxable: variant.taxable,
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
