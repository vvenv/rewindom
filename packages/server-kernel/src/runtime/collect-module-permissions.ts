
import type { ServerAppModule } from "./module-contract.js";
import type { PermissionCatalog } from "./provider-registry.js";
import type { PermissionDefinition } from "@be-water/shared";

export interface MergedPermissionCatalog extends PermissionCatalog {
  permissionKeys: readonly string[];
  tenantPermissionKeys: readonly string[];
  platformPermissionKeys: readonly string[];
}

function mergePermissionDefinitions(
  modules: readonly ServerAppModule[],
): PermissionDefinition[] {
  const byKey = new Map<string, PermissionDefinition>();

  for (const module of modules) {
    for (const permission of module.shared?.permissions ?? []) {
      byKey.set(permission.key, permission);
    }
  }

  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function collectModulePermissions(
  modules: readonly ServerAppModule[],
): MergedPermissionCatalog {
  const definitions = mergePermissionDefinitions(modules);
  const groups: Record<string, string[]> = {};

  for (const permission of definitions) {
    const group = permission.group || "其它";
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(permission.key);
  }

  return {
    permissions: definitions.map(({ key, label, group, description, scope }) => ({
      key,
      label,
      group,
      description,
      scope: scope ?? "tenant",
    })),
    groups,
    permissionKeys: definitions.map((p) => p.key),
    tenantPermissionKeys: definitions
      .filter((p) => (p.scope ?? "tenant") === "tenant")
      .map((p) => p.key),
    platformPermissionKeys: definitions
      .filter((p) => (p.scope ?? "tenant") === "platform")
      .map((p) => p.key),
  };
}

export function isValidModulePermission(
  catalog: MergedPermissionCatalog,
  value: string,
): boolean {
  return catalog.permissionKeys.includes(value);
}
