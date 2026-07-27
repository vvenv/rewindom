/** Cross-platform module manifest types (no Fastify / React dependencies). */

export type ModuleId = string;

export type ModuleKind = "kernel" | "infrastructure" | "business";

export type PermissionScope = "tenant" | "platform";

export interface PermissionDefinition {
  key: string;
  label: string;
  group: string;
  description?: string;
  /** Defaults to tenant when omitted. */
  scope?: PermissionScope;
}

export interface AuditActionDefinition {
  action: string;
  label: string;
}

/** Module-declared tenant feature (key is module-scoped string). */
export interface ModuleTenantFeatureDefinition {
  key: string;
  label: string;
  description: string;
  disabled_hint: string;
  default_enabled: boolean;
}

/**
 * A tenant-gated capability provided by a module.
 *
 * `key` is the identifier persisted in tenant settings and referenced by route
 * guards (`TenantModuleRoute`, `registerTenantGatedRoutes`). It is deliberately
 * **independent of the owning module's manifest id**, so modules may be merged
 * or split without migrating stored tenant entitlements.
 */
export interface TenantModuleEntitlement {
  key: string;
  label: string;
  description: string;
  disabled_hint: string;
  default_enabled: boolean;
  /** Fine-grained switches nested under this capability. */
  features?: ModuleTenantFeatureDefinition[];
}

export interface ModuleSharedManifest {
  permissions?: PermissionDefinition[];
  auditActions?: AuditActionDefinition[];
}

export interface ModuleManifestBase {
  id: ModuleId;
  version: string;
  label: string;
  kind: ModuleKind;
  description?: string;
  /** Other module ids that must be enabled before this one. */
  requires?: ModuleId[];
  /**
   * Tenant-gated capabilities this module provides. Keys are independent of
   * `id`; one module may provide many entitlements.
   */
  tenantEntitlements?: TenantModuleEntitlement[];
  shared?: ModuleSharedManifest;
}

/** 权限目录条目（内核聚合各模块 `shared.permissions` 后的对外形态）。 */
export interface PermissionCatalogEntry {
  key: string;
  label: string;
  group: string;
  description?: string;
  scope: PermissionScope;
}
