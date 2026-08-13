export const SHOP_PRODUCT_STATUSES = ["draft", "published"] as const;
export type ShopProductStatus = (typeof SHOP_PRODUCT_STATUSES)[number];

export function isShopProductStatus(value: unknown): value is ShopProductStatus {
  return (SHOP_PRODUCT_STATUSES as readonly unknown[]).includes(value);
}

export interface ShopVariantInput {
  sku: string;
  title?: Record<string, string> | null;
  price_cents: number;
  currency?: string;
  stock_qty: number;
  weight_g?: number;
  hs_code?: string | null;
  origin_country?: string | null;
}

export interface ShopVariant {
  id: string;
  product_id: string;
  sku: string;
  title: Record<string, string> | null;
  price_cents: number;
  currency: string;
  stock_qty: number;
  weight_g: number;
  hs_code: string | null;
  origin_country: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopProduct {
  id: string;
  tenant_id: string;
  slug: string;
  status: ShopProductStatus;
  title: Record<string, string>;
  description: Record<string, string> | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  variants: ShopVariant[];
}

export interface ShopProductListItem {
  id: string;
  slug: string;
  status: ShopProductStatus;
  title: string;
  sku_count: number;
  min_price_cents: number | null;
  currency: string | null;
  total_stock: number;
  updated_at: string;
}

export interface CreateShopProductBody {
  slug: string;
  status?: ShopProductStatus;
  title: Record<string, string> | string;
  description?: Record<string, string> | string | null;
  variant: ShopVariantInput;
}

export interface UpdateShopProductBody {
  slug?: string;
  status?: ShopProductStatus;
  title?: Record<string, string> | string;
  description?: Record<string, string> | string | null;
}

export interface CreateShopVariantBody extends ShopVariantInput {}

export interface UpdateShopVariantBody {
  sku?: string;
  title?: Record<string, string> | null;
  price_cents?: number;
  currency?: string;
  stock_qty?: number;
  weight_g?: number;
  hs_code?: string | null;
  origin_country?: string | null;
}
