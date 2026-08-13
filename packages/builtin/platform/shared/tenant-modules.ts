/** Platform per-tenant business module gates (TenantSetting.tenant_modules). */
export const TENANT_MODULES_STORAGE_KEY = "tenant_modules";


import type { TenantModuleDefinition, TenantModuleFlags } from "@rewindom/shared";

export interface TenantModuleFlagsResponse {
  modules: TenantModuleFlags;
}

export interface UpdateTenantModuleFlagsBody {
  modules: Partial<TenantModuleFlags>;
}

export function createDefaultTenantModuleFlags(
  catalog: readonly TenantModuleDefinition[],
): TenantModuleFlags {
  return Object.fromEntries(
    catalog.map((module) => [module.module_id, module.default_enabled]),
  );
}

export function isTenantModuleKey(
  catalog: readonly TenantModuleDefinition[],
  key: string,
): boolean {
  return catalog.some((module) => module.module_id === key);
}

export function formatTenantModuleAuditDetails(
  tenantSlug: string,
  catalog: readonly TenantModuleDefinition[],
  changes: Partial<TenantModuleFlags>,
): string {
  const parts = catalog
    .filter((module) => changes[module.module_id] !== undefined)
    .map(
      (module) =>
        `${module.label}=${changes[module.module_id] ? "开启" : "关闭"}`,
    );
  return `tenant=${tenantSlug}${parts.length > 0 ? `，${parts.join("，")}` : ""}`;
}
