export const SHOP_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "fulfilling",
  "shipped",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type ShopOrderStatus = (typeof SHOP_ORDER_STATUSES)[number];

export function isShopOrderStatus(value: unknown): value is ShopOrderStatus {
  return (SHOP_ORDER_STATUSES as readonly unknown[]).includes(value);
}

export interface ShopAddress {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface ShopOrderLineView {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  unit_price_cents: number;
  hs_code: string | null;
  origin_country: string | null;
}

export interface ShopShipmentView {
  id: string;
  carrier_code: string;
  tracking_number: string;
  shipped_at: string;
  customs_snapshot: Record<string, unknown> | null;
}

export interface ShopPaymentView {
  id: string;
  provider: string;
  provider_ref: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
}

export interface ShopOrderListItem {
  id: string;
  number: string;
  status: ShopOrderStatus;
  email: string;
  total_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
}

export interface ShopOrderDetail extends ShopOrderListItem {
  member_id: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  note: string | null;
  shipping_address: ShopAddress;
  shipping_rate_name: string | null;
  carrier_code: string | null;
  lines: ShopOrderLineView[];
  shipments: ShopShipmentView[];
  payments: ShopPaymentView[];
}

export interface FulfillShopOrderBody {
  carrier_code: string;
  tracking_number: string;
}

export interface ShopCheckoutBody {
  email: string;
  shipping_rate_id?: string;
  shipping_address?: ShopAddress;
  note?: string | null;
}
