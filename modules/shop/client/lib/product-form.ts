export interface ProductFormValues {
  title: string;
  title_en: string;
  slug: string;
  status: "draft" | "published";
  sku: string;
  price_cents: string;
  stock_qty: string;
  weight_g: string;
  hs_code: string;
  origin_country: string;
}

export const INITIAL_PRODUCT_FORM: ProductFormValues = {
  title: "",
  title_en: "",
  slug: "",
  status: "draft",
  sku: "",
  price_cents: "",
  stock_qty: "0",
  weight_g: "0",
  hs_code: "",
  origin_country: "",
};

type Translate = (key: string) => string;

export function validateProductForm(
  values: ProductFormValues,
  t: Translate,
): string | null {
  if (!values.title.trim()) return t("validation.titleRequired");
  if (!values.slug.trim()) return t("validation.slugRequired");
  if (!values.sku.trim()) return t("validation.skuRequired");
  if (!values.price_cents.trim() || Number(values.price_cents) < 1) {
    return t("validation.priceRequired");
  }
  return null;
}

export function buildProductPayload(values: ProductFormValues): {
  slug: string;
  status: "draft" | "published";
  title: Record<string, string>;
  variant: {
    sku: string;
    price_cents: number;
    stock_qty: number;
    weight_g: number;
    hs_code: string | null;
    origin_country: string | null;
  };
} {
  const title: Record<string, string> = { "zh-CN": values.title.trim() };
  if (values.title_en.trim()) title.en = values.title_en.trim();
  return {
    slug: values.slug.trim().toLowerCase(),
    status: values.status,
    title,
    variant: {
      sku: values.sku.trim(),
      price_cents: Math.trunc(Number(values.price_cents)),
      stock_qty: Math.max(0, Math.trunc(Number(values.stock_qty) || 0)),
      weight_g: Math.max(0, Math.trunc(Number(values.weight_g) || 0)),
      hs_code: values.hs_code.trim() || null,
      origin_country: values.origin_country.trim().toUpperCase() || null,
    },
  };
}

export function splitCountries(raw: string): string[] {
  return raw
    .split(/[,，\s]+/u)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}
