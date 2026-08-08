/** Platform tenant feature flags (TenantSetting.tenant_features). */
export const TENANT_FEATURES_STORAGE_KEY = "tenant_features";

/** Tenant quota limits (TenantSetting.tenant_limits). */
export const TENANT_LIMITS_STORAGE_KEY = "tenant_limits";


import type { TenantFeatureKey, TenantFeatureFlags } from "@be-water/shared";

export interface TenantFeatureFlagsResponse {
  features: TenantFeatureFlags;
}

export interface UpdateTenantFeatureFlagsBody {
  features: Partial<TenantFeatureFlags>;
}

export function getCatalogFeatureKeys(
  catalog: { features: readonly { key: string }[] },
): string[] {
  return catalog.features.map((feature) => feature.key);
}

export function createDefaultTenantFeatureFlags(
  catalog: { features: readonly { key: string; default_enabled: boolean }[] },
): TenantFeatureFlags {
  return Object.fromEntries(
    catalog.features.map((feature) => [feature.key, feature.default_enabled]),
  );
}

export function isTenantFeatureKey(
  key: string,
  catalog: { features: readonly { key: string }[] },
): key is TenantFeatureKey {
  return catalog.features.some((feature) => feature.key === key);
}


export function formatTenantFeatureAuditDetails(
  tenantSlug: string,
  changes: Partial<TenantFeatureFlags>,
  catalog: { features: readonly { key: string; label: string }[] },
): string {
  const parts = catalog.features
    .filter((feature) => changes[feature.key] !== undefined)
    .map(
      (feature) =>
        `${feature.label}=${changes[feature.key] ? "开启" : "关闭"}`,
    );
  return `tenant=${tenantSlug}${parts.length > 0 ? `，${parts.join("，")}` : ""}`;
}
