import type { ModuleManifestBase, ModuleTenantFeatureDefinition } from "./module-contract.js";

/** Feature flag key from module manifests (`tenantEntitlements[].features[].key`). */
export type TenantFeatureKey = string;

export type TenantFeatureFlags = Record<string, boolean>;
export type TenantModuleFlags = Record<string, boolean>;

export interface TenantModuleDefinition {
  module_id: string;
  label: string;
  description: string;
  disabled_hint: string;
  default_enabled: boolean;
}

export interface MergedTenantFeatureDefinition
  extends ModuleTenantFeatureDefinition {
  module_id: string;
}

export interface TenantEntitlementCatalog {
  modules: TenantModuleDefinition[];
  features: MergedTenantFeatureDefinition[];
}

export interface TenantEntitlementsResponse {
  modules: TenantModuleFlags;
  features: TenantFeatureFlags;
}

/**
 * Builds the tenant entitlement catalog from module manifests.
 *
 * Catalog entries are keyed by `TenantModuleEntitlement.key`, **not** by the
 * declaring module's `id` — a single module may contribute several entitlements
 * (see `module-be-water`). `TenantModuleDefinition.module_id` therefore carries
 * the entitlement key; the name is kept for wire compatibility with stored
 * tenant settings and the platform console API.
 */
export function collectTenantCatalogFromManifests(
  modules: readonly ModuleManifestBase[],
): TenantEntitlementCatalog {
  const moduleMap = new Map<string, TenantModuleDefinition>();
  const featureMap = new Map<string, MergedTenantFeatureDefinition>();

  for (const module of modules) {
    for (const entitlement of module.tenantEntitlements ?? []) {
      moduleMap.set(entitlement.key, {
        module_id: entitlement.key,
        label: entitlement.label,
        description: entitlement.description,
        disabled_hint: entitlement.disabled_hint,
        default_enabled: entitlement.default_enabled,
      });

      for (const feature of entitlement.features ?? []) {
        featureMap.set(feature.key, {
          ...feature,
          module_id: entitlement.key,
        });
      }
    }
  }

  const catalogModules = [...moduleMap.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "zh-CN"),
  );

  const catalogFeatures = [...featureMap.values()].sort((a, b) => {
    const moduleOrder =
      catalogModules.findIndex((m) => m.module_id === a.module_id) -
      catalogModules.findIndex((m) => m.module_id === b.module_id);
    if (moduleOrder !== 0) {
      return moduleOrder;
    }
    return a.label.localeCompare(b.label, "zh-CN");
  });

  return {
    modules: catalogModules,
    features: catalogFeatures,
  };
}

export function findCatalogFeature(
  catalog: {
    features: readonly {
      key: string;
      label: string;
      disabled_hint: string;
    }[];
  },
  key: string,
):
  | { key: string; label: string; disabled_hint: string }
  | undefined {
  return catalog.features.find((feature) => feature.key === key);
}
