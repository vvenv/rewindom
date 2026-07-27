import { collectTenantCatalogFromManifests, type TenantEntitlementCatalog } from "@be-water/shared";

import type { ServerAppModule } from "./module-contract.js";

let enabledModules: readonly ServerAppModule[] = [];
let cachedCatalog: TenantEntitlementCatalog | undefined;

export function configureServerTenantCatalog(
  modules: readonly ServerAppModule[],
): void {
  enabledModules = modules;
  cachedCatalog = undefined;
}

export function getServerTenantCatalog(): TenantEntitlementCatalog {
  cachedCatalog ??= collectTenantCatalogFromManifests(enabledModules);
  return cachedCatalog;
}
