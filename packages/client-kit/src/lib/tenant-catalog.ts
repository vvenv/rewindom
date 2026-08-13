import { collectTenantCatalogFromManifests, type TenantEntitlementCatalog, type ModuleManifestBase  } from "@rewindom/shared";

let clientTenantCatalog: TenantEntitlementCatalog | null = null;

export function configureClientTenantCatalog(
  modules: readonly ModuleManifestBase[],
): void {
  clientTenantCatalog = collectTenantCatalogFromManifests(modules);
}

export function getClientTenantCatalog(): TenantEntitlementCatalog {
  if (!clientTenantCatalog) {
    throw new Error("Client tenant catalog is not configured");
  }
  return clientTenantCatalog;
}
