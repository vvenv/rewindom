import type {
  CreateShopDiscountBody,
  ShopDiscount,
  ShopDiscountStatus,
  ShopDiscountType,
} from "../../shared/discount.js";

export interface DiscountFormValues {
  code: string;
  type: ShopDiscountType;
  value: string;
  min_subtotal_cents: string;
  max_uses: string;
  starts_at: string;
  ends_at: string;
  status: ShopDiscountStatus;
}

export const INITIAL_DISCOUNT_FORM: DiscountFormValues = {
  code: "",
  type: "percent",
  value: "10",
  min_subtotal_cents: "",
  max_uses: "",
  starts_at: "",
  ends_at: "",
  status: "draft",
};

export function discountToForm(discount: ShopDiscount): DiscountFormValues {
  return {
    code: discount.code,
    type: discount.type,
    value: String(discount.value),
    min_subtotal_cents:
      discount.min_subtotal_cents > 0 ? String(discount.min_subtotal_cents) : "",
    max_uses: discount.max_uses != null ? String(discount.max_uses) : "",
    starts_at: discount.starts_at ?? "",
    ends_at: discount.ends_at ?? "",
    status: discount.status,
  };
}

function optionalInt(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Math.trunc(Number(trimmed));
  return Number.isFinite(n) ? n : null;
}

export function buildDiscountPayload(
  values: DiscountFormValues,
): CreateShopDiscountBody {
  return {
    code: values.code.trim().toUpperCase(),
    type: values.type,
    value: Math.trunc(Number(values.value)),
    min_subtotal_cents: optionalInt(values.min_subtotal_cents) ?? 0,
    max_uses: optionalInt(values.max_uses),
    starts_at: values.starts_at.trim() || null,
    ends_at: values.ends_at.trim() || null,
    status: values.status,
  };
}

type Translate = (key: string) => string;

export function validateDiscountForm(
  values: DiscountFormValues,
  t: Translate,
): string | null {
  if (!values.code.trim()) return t("validation.discountCodeRequired");
  const value = Number(values.value);
  if (!Number.isFinite(value) || value < 1) {
    return t("validation.discountValueRequired");
  }
  if (values.type === "percent" && value > 100) {
    return t("validation.discountValueRequired");
  }
  return null;
}
