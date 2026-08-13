import type { ShopLocalizedMap } from "./locale.js";
import type {
  ShopInventoryPolicy,
  ShopProductImage,
  ShopProductStatus,
} from "./product-commerce.js";

export interface ShopOptionValue {
  id: string;
  name: ShopLocalizedMap;
}

export interface ShopProductOption {
  id: string;
  name: ShopLocalizedMap;
  values: ShopOptionValue[];
}

export interface ShopVariantInput {
  id?: string;
  sku: string;
  title?: Record<string, string> | null;
  option_values?: Record<string, string>;
  price_cents: number;
  compare_at_price_cents?: number | null;
  currency?: string;
  stock_qty: number;
  weight_g?: number;
  barcode?: string | null;
  hs_code?: string | null;
  origin_country?: string | null;
  inventory_policy?: ShopInventoryPolicy;
  track_inventory?: boolean;
  requires_shipping?: boolean;
  taxable?: boolean;
}

export interface ShopVariant {
  id: string;
  product_id: string;
  sku: string;
  title: Record<string, string> | null;
  option_values: Record<string, string>;
  price_cents: number;
  compare_at_price_cents: number | null;
  currency: string;
  stock_qty: number;
  weight_g: number;
  barcode: string | null;
  hs_code: string | null;
  origin_country: string | null;
  inventory_policy: ShopInventoryPolicy;
  track_inventory: boolean;
  requires_shipping: boolean;
  taxable: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopProduct {
  id: string;
  tenant_id: string;
  slug: string;
  status: ShopProductStatus;
  title: Record<string, string>;
  subtitle: Record<string, string> | null;
  description: Record<string, string> | null;
  images: ShopProductImage[];
  product_type: string | null;
  vendor: string | null;
  tags: string[];
  seo_title: Record<string, string> | null;
  seo_description: Record<string, string> | null;
  options: ShopProductOption[];
  published_at: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  variants: ShopVariant[];
  collection_ids: string[];
  collection_slugs: string[];
}

export interface ShopProductListItem {
  id: string;
  slug: string;
  status: ShopProductStatus;
  title: string;
  image_url: string | null;
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
  subtitle?: Record<string, string> | string | null;
  description?: Record<string, string> | string | null;
  images?: ShopProductImage[];
  product_type?: string | null;
  vendor?: string | null;
  tags?: string[] | string;
  seo_title?: Record<string, string> | string | null;
  seo_description?: Record<string, string> | string | null;
  options?: ShopProductOption[];
  variants: ShopVariantInput[];
  collection_ids?: string[];
}

export interface UpdateShopProductBody {
  slug?: string;
  status?: ShopProductStatus;
  title?: Record<string, string> | string;
  subtitle?: Record<string, string> | string | null;
  description?: Record<string, string> | string | null;
  images?: ShopProductImage[];
  product_type?: string | null;
  vendor?: string | null;
  tags?: string[] | string;
  seo_title?: Record<string, string> | string | null;
  seo_description?: Record<string, string> | string | null;
  options?: ShopProductOption[];
  variants?: ShopVariantInput[];
  collection_ids?: string[];
}

export interface CreateShopVariantBody extends ShopVariantInput {}

export interface UpdateShopVariantBody {
  sku?: string;
  title?: Record<string, string> | null;
  option_values?: Record<string, string>;
  price_cents?: number;
  compare_at_price_cents?: number | null;
  currency?: string;
  stock_qty?: number;
  weight_g?: number;
  barcode?: string | null;
  hs_code?: string | null;
  origin_country?: string | null;
  inventory_policy?: ShopInventoryPolicy;
  track_inventory?: boolean;
  requires_shipping?: boolean;
  taxable?: boolean;
}
