import { getServerTenantCatalog } from "@be-water/server-kernel/runtime/tenant-catalog.js";
import { type TenantModuleFlags } from "@be-water/shared";

import { TENANT_MODULES_STORAGE_KEY, createDefaultTenantModuleFlags } from "../../shared/index.js";

import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";

type StoredTenantModules = Partial<TenantModuleFlags>;

function normalizeStoredModules(
  raw: StoredTenantModules | null | undefined,
): StoredTenantModules {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const catalog = getServerTenantCatalog();
  const result: StoredTenantModules = {};
  for (const module of catalog.modules) {
    if (typeof raw[module.module_id] === "boolean") {
      result[module.module_id] = raw[module.module_id];
    }
  }
  return result;
}

function resolveModuleEnabled(
  storedModules: StoredTenantModules,
  moduleId: string,
): boolean {
  if (typeof storedModules[moduleId] === "boolean") {
    return storedModules[moduleId]!;
  }

  const definition = getServerTenantCatalog().modules.find(
    (module) => module.module_id === moduleId,
  );
  return definition?.default_enabled ?? true;
}

export async function getTenantModuleFlags(
  tenantId: string,
): Promise<TenantModuleFlags> {
  const catalog = getServerTenantCatalog();
  const stored = await getTenantJsonSetting<StoredTenantModules>(
    tenantId,
    TENANT_MODULES_STORAGE_KEY,
    normalizeStoredModules,
    {},
  );

  const defaults = createDefaultTenantModuleFlags(catalog.modules);
  const flags: TenantModuleFlags = { ...defaults };
  for (const module of catalog.modules) {
    flags[module.module_id] = resolveModuleEnabled(stored, module.module_id);
  }
  return flags;
}

export async function isTenantModuleEnabled(
  tenantId: string,
  moduleId: string,
): Promise<boolean> {
  const catalog = getServerTenantCatalog();
  if (!catalog.modules.some((module) => module.module_id === moduleId)) {
    return true;
  }

  const flags = await getTenantModuleFlags(tenantId);
  return Boolean(flags[moduleId]);
}

export async function saveTenantModuleFlags(
  tenantId: string,
  updates: Partial<TenantModuleFlags>,
): Promise<TenantModuleFlags> {
  const catalog = getServerTenantCatalog();
  const current = await getTenantJsonSetting<StoredTenantModules>(
    tenantId,
    TENANT_MODULES_STORAGE_KEY,
    normalizeStoredModules,
    {},
  );

  const merged: StoredTenantModules = { ...current };
  for (const module of catalog.modules) {
    if (updates[module.module_id] !== undefined) {
      merged[module.module_id] = updates[module.module_id];
    }
  }

  await saveTenantJsonSetting(tenantId, TENANT_MODULES_STORAGE_KEY, merged);

  return getTenantModuleFlags(tenantId);
}
