import type { TenantLimitKey, TenantLimitValues } from "./pricing-plans.js";

export type { TenantLimitKey, TenantLimitValues };

export interface TenantLimitDefinition {
  key: TenantLimitKey;
  label: string;
  description: string;
  default_value: number | null;
  min: number;
}

export const TENANT_LIMIT_REGISTRY = {
  max_users: {
    key: "max_users",
    label: "用户数上限",
    description: "租户内登录用户数量（不含代登录影子账号）",
    default_value: null,
    min: 1,
  },
} satisfies Record<TenantLimitKey, TenantLimitDefinition>;

export const TENANT_LIMIT_KEYS = Object.keys(
  TENANT_LIMIT_REGISTRY,
) as TenantLimitKey[];

export function formatLimitExceededMessage(
  limitKey: TenantLimitKey,
  limit: number,
): string {
  const { label } = TENANT_LIMIT_REGISTRY[limitKey];
  return `已达${label}（${limit}），请联系平台管理员升级套餐`;
}
