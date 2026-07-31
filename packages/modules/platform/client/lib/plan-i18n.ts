import {
  PRICING_PLANS,
  TENANT_LIMIT_REGISTRY,
  type PlanSlug,
  type TenantLimitKey,
} from "../../shared/index.js";

import type { TFunction } from "i18next";

export function translatePlanName(t: TFunction, slug: PlanSlug | string): string {
  const translated = t(`plans.${slug}.name`, {
    ns: "platform",
    defaultValue: "",
  });
  if (translated) return translated;
  return PRICING_PLANS[slug as PlanSlug]?.name ?? slug;
}

export function translatePlanDescription(
  t: TFunction,
  slug: PlanSlug | string,
): string {
  const translated = t(`plans.${slug}.description`, {
    ns: "platform",
    defaultValue: "",
  });
  if (translated) return translated;
  return PRICING_PLANS[slug as PlanSlug]?.description ?? "";
}

export function translateLimitLabel(
  t: TFunction,
  key: TenantLimitKey | string,
): string {
  const translated = t(`limits.${key}.label`, {
    ns: "platform",
    defaultValue: "",
  });
  if (translated) return translated;
  return TENANT_LIMIT_REGISTRY[key as TenantLimitKey]?.label ?? key;
}

export function translateLimitDescription(
  t: TFunction,
  key: TenantLimitKey | string,
): string {
  const translated = t(`limits.${key}.description`, {
    ns: "platform",
    defaultValue: "",
  });
  if (translated) return translated;
  return TENANT_LIMIT_REGISTRY[key as TenantLimitKey]?.description ?? "";
}
