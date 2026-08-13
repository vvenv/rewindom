export const SHOP_DISCOUNT_TYPES = ["percent", "fixed"] as const;
export type ShopDiscountType = (typeof SHOP_DISCOUNT_TYPES)[number];

export function isShopDiscountType(value: unknown): value is ShopDiscountType {
  return (SHOP_DISCOUNT_TYPES as readonly unknown[]).includes(value);
}

export const SHOP_DISCOUNT_STATUSES = ["draft", "active", "disabled"] as const;
export type ShopDiscountStatus = (typeof SHOP_DISCOUNT_STATUSES)[number];

export function isShopDiscountStatus(
  value: unknown,
): value is ShopDiscountStatus {
  return (SHOP_DISCOUNT_STATUSES as readonly unknown[]).includes(value);
}

export const DISCOUNT_CODE_RE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/u;

export function normalizeDiscountCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return DISCOUNT_CODE_RE.test(code) ? code : null;
}

export interface ShopDiscount {
  id: string;
  tenant_id: string;
  code: string;
  type: ShopDiscountType;
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  status: ShopDiscountStatus;
  created_at: string;
  updated_at: string;
}

export interface ShopDiscountListItem {
  id: string;
  code: string;
  type: ShopDiscountType;
  value: number;
  status: ShopDiscountStatus;
  used_count: number;
  max_uses: number | null;
  updated_at: string;
}

export interface CreateShopDiscountBody {
  code: string;
  type: ShopDiscountType;
  value: number;
  min_subtotal_cents?: number;
  max_uses?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: ShopDiscountStatus;
}

export interface UpdateShopDiscountBody {
  code?: string;
  type?: ShopDiscountType;
  value?: number;
  min_subtotal_cents?: number;
  max_uses?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: ShopDiscountStatus;
}

export interface ShopDiscountQuoteInput {
  type: ShopDiscountType;
  value: number;
  min_subtotal_cents: number;
  max_uses: number | null;
  used_count: number;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  status: string;
}

export type ShopDiscountQuote =
  | { ok: true; discount_cents: number }
  | { ok: false };

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function quoteDiscount(
  discount: ShopDiscountQuoteInput,
  subtotal_cents: number,
  now: Date = new Date(),
): ShopDiscountQuote {
  if (discount.status !== "active") return { ok: false };
  if (!isShopDiscountType(discount.type)) return { ok: false };
  const starts = asDate(discount.starts_at);
  const ends = asDate(discount.ends_at);
  if (starts && now < starts) return { ok: false };
  if (ends && now > ends) return { ok: false };
  if (discount.max_uses != null && discount.used_count >= discount.max_uses) {
    return { ok: false };
  }
  if (subtotal_cents < Math.max(0, discount.min_subtotal_cents)) {
    return { ok: false };
  }
  let cents = 0;
  if (discount.type === "percent") {
    if (discount.value < 1 || discount.value > 100) return { ok: false };
    cents = Math.floor((subtotal_cents * discount.value) / 100);
  } else {
    if (discount.value < 1) return { ok: false };
    cents = discount.value;
  }
  return { ok: true, discount_cents: Math.min(cents, Math.max(0, subtotal_cents)) };
}
