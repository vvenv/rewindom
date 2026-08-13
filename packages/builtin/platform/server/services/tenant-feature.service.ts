import { getServerTenantCatalog } from "@rewindom/server-kernel/runtime/tenant-catalog.js";
import { type TenantFeatureFlags, type TenantFeatureKey } from "@rewindom/shared";

import { TENANT_FEATURES_STORAGE_KEY, createDefaultTenantFeatureFlags, getCatalogFeatureKeys, getFeatureModuleId } from "../../shared/index.js";

import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";
import { isTenantModuleEnabled } from "./tenant-module.service.js";

type StoredTenantFeatures = Partial<TenantFeatureFlags>;

function normalizeStoredFeatures(
  raw: StoredTenantFeatures | null | undefined,
  featureKeys: readonly string[],
): StoredTenantFeatures {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const result: StoredTenantFeatures = {};
  for (const key of featureKeys) {
    if (typeof raw[key] === "boolean") {
      result[key] = raw[key];
    }
  }
  return result;
}

function resolveFeatureEnabled(
  storedFeatures: StoredTenantFeatures,
  key: string,
  defaultEnabled: boolean,
): boolean {
  if (typeof storedFeatures[key] === "boolean") {
    return storedFeatures[key]!;
  }
  return defaultEnabled;
}

export async function getTenantFeatureFlags(
  tenantId: string,
): Promise<TenantFeatureFlags> {
  const catalog = getServerTenantCatalog();
  const featureKeys = getCatalogFeatureKeys(catalog);
  const stored = await getTenantJsonSetting<StoredTenantFeatures>(
    tenantId,
    TENANT_FEATURES_STORAGE_KEY,
    (raw) => normalizeStoredFeatures(raw, featureKeys),
    {},
  );

  const flags = createDefaultTenantFeatureFlags(catalog);
  for (const feature of catalog.features) {
    flags[feature.key] = resolveFeatureEnabled(
      stored,
      feature.key,
      feature.default_enabled,
    );
  }
  return flags;
}

export async function isTenantFeatureEnabled(
  tenantId: string,
  key: TenantFeatureKey,
): Promise<boolean> {
  const catalog = getServerTenantCatalog();
  const moduleId = getFeatureModuleId(catalog, key);
  if (
    moduleId &&
    catalog.modules.some((module) => module.module_id === moduleId)
  ) {
    const moduleEnabled = await isTenantModuleEnabled(tenantId, moduleId);
    if (!moduleEnabled) {
      return false;
    }
  }

  const flags = await getTenantFeatureFlags(tenantId);
  return flags[key];
}

export async function saveTenantFeatureFlags(
  tenantId: string,
  updates: Partial<TenantFeatureFlags>,
): Promise<TenantFeatureFlags> {
  const catalog = getServerTenantCatalog();
  const featureKeys = getCatalogFeatureKeys(catalog);
  const current = await getTenantJsonSetting<StoredTenantFeatures>(
    tenantId,
    TENANT_FEATURES_STORAGE_KEY,
    (raw) => normalizeStoredFeatures(raw, featureKeys),
    {},
  );

  const merged: StoredTenantFeatures = { ...current };
  for (const key of featureKeys) {
    if (updates[key] !== undefined) {
      merged[key] = updates[key];
    }
  }

  await saveTenantJsonSetting(tenantId, TENANT_FEATURES_STORAGE_KEY, merged);

  return getTenantFeatureFlags(tenantId);
}
