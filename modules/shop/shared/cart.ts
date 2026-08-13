import type { ShopInventoryPolicy } from "./product-commerce.js";

export interface ShopCartItemView {
  id: string;
  variant_id: string;
  product_id: string;
  product_slug: string;
  title: string;
  sku: string;
  image_url: string | null;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  stock_qty: number;
  track_inventory: boolean;
  inventory_policy: ShopInventoryPolicy;
  requires_shipping: boolean;
  taxable: boolean;
  line_total_cents: number;
}

export interface ShopCartView {
  id: string;
  currency: string;
  item_count: number;
  subtotal_cents: number;
  items: ShopCartItemView[];
}
