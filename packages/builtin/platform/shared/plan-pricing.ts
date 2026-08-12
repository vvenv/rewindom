/**
 * 平台套餐的**可配置部分** —— 定价、上架、推荐、排序与展示文案。
 *
 * `PRICING_PLANS` 里剩下的是**结构**：有哪几个 slug、各自的配额与功能开关。那些改动
 * 会牵连计费与权限逻辑，属于代码。而「专业版卖多少钱、定价页上排第几、卖点写什么」
 * 是运营决策，不该为了改一句话发一次版。
 *
 * 存在 `AppSetting["plan_pricing"]`（平台级，不分租户），由平台控制台的套餐配置页维护。
 * 没配过的字段一律回落到代码里的默认值——全新部署零配置也有一份能看的定价页。
 *
 * 文案刻意用扁平的 `locale → 文案`，不用 marketing 的 `LocalizedText`（`__i18n` 包装）：
 * platform 是基础设施层，不该反向依赖 marketing。
 */

import {
  comparePlanRank,
  PLAN_SLUGS,
  PRICING_PLANS,
  type PlanSlug,
} from "./pricing-plans.js";

/** `AppSetting.key` —— 平台套餐定价与展示配置。 */
export const APP_SETTING_KEY_PLAN_PRICING = "plan_pricing";

/** locale → 文案；缺的语言由调用方回落到内置文案。 */
export type PlanText = Record<string, string>;
/** locale → 卖点列表。 */
export type PlanFeatureList = Record<string, string[]>;

export interface PlanPricingOverride {
  /** 单位分；`null` 表示议价档。不填 = 用代码默认值。 */
  price_cents?: number | null;
  currency?: string;
  public_listed?: boolean;
  highlighted?: boolean;
  sort_order?: number;
  name?: PlanText;
  description?: PlanText;
  features?: PlanFeatureList;
}

export type PlanPricingConfig = Partial<Record<string, PlanPricingOverride>>;

export interface ResolvedPlan {
  slug: PlanSlug;
  price_cents: number | null;
  currency: string;
  public_listed: boolean;
  highlighted: boolean;
  sort_order: number;
  /**
   * 覆盖文案（可能是空表）。
   *
   * 空的那一格由调用方回落到内置文案：服务端读 `platform` 的 locale JSON
   *（`plan-i18n.ts`），客户端走 i18next。两边回落到的是同一份 JSON。
   */
  name: PlanText;
  description: PlanText;
  features: PlanFeatureList;
}

function asText(value: unknown): PlanText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: PlanText = {};
  for (const [locale, text] of Object.entries(value as Record<string, unknown>)) {
    if (typeof text === "string" && text.trim()) out[locale] = text;
  }
  return out;
}

function asFeatureList(value: unknown): PlanFeatureList {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: PlanFeatureList = {};
  for (const [locale, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;
    const lines = list.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
    if (lines.length > 0) out[locale] = lines;
  }
  return out;
}

/** 库里的脏数据不该炸掉定价页：认不出的字段一律当没配。 */
export function parsePlanPricingConfig(raw: unknown): PlanPricingConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PlanPricingConfig = {};
  for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!PLAN_SLUGS.includes(slug as PlanSlug)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const price = entry.price_cents;
    out[slug] = {
      ...(price === null || (typeof price === "number" && Number.isInteger(price) && price >= 0)
        ? { price_cents: price as number | null }
        : {}),
      ...(typeof entry.currency === "string" && entry.currency.trim()
        ? { currency: entry.currency.trim().toUpperCase() }
        : {}),
      ...(typeof entry.public_listed === "boolean"
        ? { public_listed: entry.public_listed }
        : {}),
      ...(typeof entry.highlighted === "boolean"
        ? { highlighted: entry.highlighted }
        : {}),
      ...(typeof entry.sort_order === "number" && Number.isFinite(entry.sort_order)
        ? { sort_order: entry.sort_order }
        : {}),
      name: asText(entry.name),
      description: asText(entry.description),
      features: asFeatureList(entry.features),
    };
  }
  return out;
}

/**
 * 代码默认值 + 存储覆盖 → 一张完整的套餐表，已排好序。
 *
 * 排序默认按价格（未定价的排最后），运营可以用 `sort_order` 顶掉——定价页上
 * 「先摆哪一档」是营销决策，不是价格的函数。
 */
export function resolvePlanCatalog(config: PlanPricingConfig): ResolvedPlan[] {
  return PLAN_SLUGS.map((slug, index) => {
    const base = PRICING_PLANS[slug];
    const override = config[slug] ?? {};
    return {
      slug,
      price_cents:
        override.price_cents !== undefined
          ? override.price_cents
          : base.price_cents,
      currency: override.currency ?? base.currency,
      public_listed: override.public_listed ?? base.public_listed,
      highlighted: override.highlighted ?? base.highlighted ?? false,
      sort_order: override.sort_order ?? index,
      name: override.name ?? {},
      description: override.description ?? {},
      features: override.features ?? {},
    };
  }).sort(
    (a, b) =>
      a.sort_order - b.sort_order || comparePlanRank(a.slug, b.slug),
  );
}

/** 只留公开定价区要展示的那几档。 */
export function listedPlansOf(catalog: ResolvedPlan[]): ResolvedPlan[] {
  return catalog.filter((plan) => plan.public_listed);
}

/**
 * 价格展示 —— **不由段配置前后缀**，符号与位置交给 `Intl.NumberFormat` 按访客语言定。
 *
 * 中文站看到「¥99.00」、英文站看到「CN¥99.00」，换成 USD 就是「$99.00」——手填
 * 前后缀做不到这件事，还会在换币种时集体失真。
 */
export function formatPlanPrice(
  priceCents: number,
  currency: string,
  locale: string,
): string {
  const amount = priceCents / 100;
  try {
    return new Intl.NumberFormat(locale === "en" ? "en-US" : "zh-CN", {
      style: "currency",
      currency: currency || "CNY",
      // 整数价格不显示 .00：定价页上「¥99」比「¥99.00」干净
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
