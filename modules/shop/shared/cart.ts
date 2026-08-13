export interface ShopCartItemView {
  id: string;
  variant_id: string;
  product_id: string;
  product_slug: string;
  title: string;
  sku: string;
  quantity: number;
  unit_price_cents: number;
  currency: string;
  stock_qty: number;
  line_total_cents: number;
}

export interface ShopCartView {
  id: string;
  currency: string;
  item_count: number;
  subtotal_cents: number;
  items: ShopCartItemView[];
}
