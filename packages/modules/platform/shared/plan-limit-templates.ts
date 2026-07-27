import {
  PLAN_SLUGS,
  PRICING_PLANS,
  type PlanSlug,
  type TenantLimitKey,
  type TenantLimitValues,
} from "./pricing-plans.js";
import { TENANT_LIMIT_KEYS, TENANT_LIMIT_REGISTRY } from "./tenant-limits.js";

export const APP_SETTING_KEY_PLAN_LIMIT_TEMPLATES = "plan_limit_templates";

/** 各套餐用量模板（平台可配置，null 表示不限） */
export type PlanLimitTemplates = Record<PlanSlug, Partial<TenantLimitValues>>;

export type PlanLimitTemplateOverrides = Partial<PlanLimitTemplates>;

export function getDefaultPlanLimitTemplates(): PlanLimitTemplates {
  return Object.fromEntries(
    PLAN_SLUGS.map((slug) => [slug, { ...PRICING_PLANS[slug].limits }]),
  ) as PlanLimitTemplates;
}

export function resolvePlanLimitTemplates(
  overrides: PlanLimitTemplateOverrides | null | undefined,
): PlanLimitTemplates {
  const defaults = getDefaultPlanLimitTemplates();
  if (!overrides || typeof overrides !== "object") {
    return defaults;
  }

  const resolved = { ...defaults };
  for (const slug of PLAN_SLUGS) {
    const planOverrides = overrides[slug];
    if (!planOverrides || typeof planOverrides !== "object") {
      continue;
    }
    resolved[slug] = { ...defaults[slug] };
    for (const key of TENANT_LIMIT_KEYS) {
      if (key in planOverrides) {
        resolved[slug][key] = planOverrides[key] ?? null;
      }
    }
  }
  return resolved;
}

export function validatePlanLimitValue(
  key: TenantLimitKey,
  value: unknown,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    throw new Error(`${TENANT_LIMIT_REGISTRY[key].label}必须是整数`);
  }
  const { min, label } = TENANT_LIMIT_REGISTRY[key];
  if (num < min) {
    throw new Error(`${label}不能小于 ${min}`);
  }
  return num;
}

export function validatePlanLimitTemplates(
  input: unknown,
): PlanLimitTemplates {
  if (!input || typeof input !== "object") {
    throw new Error("无效的套餐用量配置");
  }

  const body = input as Partial<PlanLimitTemplates>;
  const result = getDefaultPlanLimitTemplates();

  for (const slug of PLAN_SLUGS) {
    const planLimits = body[slug];
    if (planLimits === undefined) {
      continue;
    }
    if (!planLimits || typeof planLimits !== "object") {
      throw new Error(`套餐 ${slug} 的用量配置无效`);
    }

    result[slug] = {};
    for (const key of TENANT_LIMIT_KEYS) {
      if (!(key in planLimits)) {
        result[slug][key] = getDefaultPlanLimitTemplates()[slug][key] ?? null;
        continue;
      }
      result[slug][key] = validatePlanLimitValue(key, planLimits[key]);
    }
  }

  return result;
}
