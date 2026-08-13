import { type TenantEntitlementCatalog, type TenantFeatureKey  } from "@rewindom/shared";

/**
 * 目录构建本身在 `@rewindom/shared`（`collectTenantCatalogFromManifests`）——
 * 此处只保留平台侧的查询辅助，避免两份实现漂移。
 */
export function getFeatureModuleId(
  catalog: TenantEntitlementCatalog,
  key: TenantFeatureKey | string,
): string | undefined {
  return catalog.features.find((feature) => feature.key === key)?.module_id;
}
