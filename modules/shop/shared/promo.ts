/**
 * 公告条要推哪个优惠码 —— 纯规则，SSR 与编辑器预览共用。
 *
 * 租户不挑码：渲染期从**当前生效**的整单码里自动挑一个「力度最大」的。
 *
 * 跨类型没有可比的基准（8 折 vs 立减 50 要先知道客单价），所以口径写死成两条，
 * 好解释也好测：**百分比码优先，同类型取数值大的**；再平手按 code 升序，
 * 保证同一份数据每次渲染挑出同一个码（页头不该刷一次换一个）。
 *
 * ⚠️ 没有「这个码可不可以公开」这一维度：任何启用中且在有效期内的码都可能被挂到
 * 页顶。定向 / 内部高额码要么别设成启用，要么加期限——否则它会自己上页头。
 */

import { isShopDiscountType, type ShopDiscount } from "./discount.js";

/** 公告条要用到的那几个字段（服务端从 `ShopDiscount` 裁出来即可）。 */
export interface ShopPromoCandidate {
  code: string;
  type: ShopDiscount["type"];
  value: number;
  status: ShopDiscount["status"];
  max_uses: number | null;
  used_count: number;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
}

/** 落到店面上的那一条：文案模板拿它填空。 */
export interface ShopPromoView {
  code: string;
  type: ShopDiscount["type"];
  /** 已按语言 / 币种定稿的力度串（`20%` / `$5.00`），模板里的 `{value}`。 */
  value_label: string;
  /** ISO 串，给「到 X 月 X 日」这类文案留的；没有截止就是 null。 */
  ends_at: string | null;
}

function asDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 现在能不能用。与 `quoteDiscount` 的闸门同源，但**不看小计**——公告条是在还没有
 * 购物车的地方展示的，`min_subtotal_cents` 属于文案该讲清楚的事，不是隐藏条件。
 */
export function isShopPromoLive(
  discount: ShopPromoCandidate,
  now: Date = new Date(),
): boolean {
  if (discount.status !== "active") return false;
  if (!isShopDiscountType(discount.type)) return false;
  if (discount.value <= 0) return false;
  if (discount.type === "percent" && discount.value > 100) return false;
  if (discount.max_uses != null && discount.used_count >= discount.max_uses) {
    return false;
  }
  const starts = asDate(discount.starts_at);
  if (starts && starts > now) return false;
  const ends = asDate(discount.ends_at);
  if (ends && ends <= now) return false;
  return true;
}

/** 百分比在前，同类型数值大的在前，再按 code 升序（稳定）。 */
function comparePromo(a: ShopPromoCandidate, b: ShopPromoCandidate): number {
  if (a.type !== b.type) return a.type === "percent" ? -1 : 1;
  if (a.value !== b.value) return b.value - a.value;
  return a.code.localeCompare(b.code);
}

/** 当前生效的码里力度最大的那个；一个都没有就是 null（整段不渲染）。 */
export function pickShopPromo<T extends ShopPromoCandidate>(
  discounts: readonly T[],
  now: Date = new Date(),
): T | null {
  const live = discounts.filter((discount) => isShopPromoLive(discount, now));
  if (live.length === 0) return null;
  return [...live].sort(comparePromo)[0] ?? null;
}

/**
 * 文案模板填空：`{code}` 换成码，`{value}` 换成力度串。
 *
 * 只认这两个占位符，认不出的原样留着——租户写错一个名字，看到的是自己写的那串，
 * 而不是被悄悄吞掉的空白。
 */
export function fillShopPromoText(
  template: string,
  promo: ShopPromoView,
): string {
  return template
    .replaceAll("{code}", promo.code)
    .replaceAll("{value}", promo.value_label);
}
