import {
  TENANT_LIMIT_REGISTRY,
  type PlanSlug,
  type TenantLimitKey,
} from "../../shared/index.js";

import type { TFunction } from "i18next";

/**
 * 套餐名 —— 与服务端 `platform/server/plan-i18n.ts` 读同一份 `plans.<slug>.*`。
 *
 * 认不出的 slug 原样显示 slug：下游产品仓可以有自己的套餐，没补文案时显示
 * `enterprise_plus` 好过显示一个空白。
 */
export function translatePlanName(t: TFunction, slug: PlanSlug | string): string {
  return t(`plans.${slug}.name`, { ns: "platform", defaultValue: slug });
}

export function translatePlanDescription(
  t: TFunction,
  slug: PlanSlug | string,
): string {
  return t(`plans.${slug}.description`, { ns: "platform", defaultValue: "" });
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
