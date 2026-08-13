import { type TenantFeatureFlags, type TenantModuleFlags, type TenantModuleDefinition ,
  type MergedTenantFeatureDefinition,
  type TenantEntitlementCatalog } from "@rewindom/shared";

import { formatTenantFeatureAuditDetails } from "./tenant-features.js";
import { type UpdateTenantModuleFlagsBody, formatTenantModuleAuditDetails } from "./tenant-modules.js";





export interface UpdateTenantEntitlementsBody {
  modules?: UpdateTenantModuleFlagsBody["modules"];
  features?: Partial<TenantFeatureFlags>;
}

export function groupTenantCatalogByModule(
  catalog: TenantEntitlementCatalog,
): Array<{
  module: TenantModuleDefinition;
  features: MergedTenantFeatureDefinition[];
}> {
  const featuresByModule = new Map<string, MergedTenantFeatureDefinition[]>();

  for (const feature of catalog.features) {
    const list = featuresByModule.get(feature.module_id) ?? [];
    list.push(feature);
    featuresByModule.set(feature.module_id, list);
  }

  return catalog.modules.map((module) => ({
    module,
    features: featuresByModule.get(module.module_id) ?? [],
  }));
}

export function formatTenantEntitlementsAuditDetails(
  tenantSlug: string,
  moduleChanges: Partial<TenantModuleFlags>,
  featureChanges: Partial<TenantFeatureFlags>,
  catalog: TenantEntitlementCatalog,
): string {
  const moduleDetails = formatTenantModuleAuditDetails(
    tenantSlug,
    catalog.modules,
    moduleChanges,
  );
  const featureDetails = formatTenantFeatureAuditDetails(
    tenantSlug,
    featureChanges,
    catalog,
  );

  const moduleSuffix = moduleDetails.replace(`tenant=${tenantSlug}`, "").trim();
  const featureSuffix = featureDetails
    .replace(`tenant=${tenantSlug}`, "")
    .trim();
  const suffix = [moduleSuffix, featureSuffix]
    .filter((part) => part.length > 0)
    .join("，");

  return suffix.length > 0 ? `tenant=${tenantSlug}，${suffix}` : `tenant=${tenantSlug}`;
}
