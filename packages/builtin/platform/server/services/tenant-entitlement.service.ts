
import { type TenantEntitlementsResponse } from "@be-water/shared";

import { type UpdateTenantEntitlementsBody } from "../../shared/index.js";

import { getTenantFeatureFlags, saveTenantFeatureFlags } from "./tenant-feature.service.js";
import {
  getTenantModuleFlags,
  saveTenantModuleFlags,
} from "./tenant-module.service.js";


export async function getTenantEntitlements(
  tenantId: string,
): Promise<TenantEntitlementsResponse> {
  const [modules, features] = await Promise.all([
    getTenantModuleFlags(tenantId),
    getTenantFeatureFlags(tenantId),
  ]);

  return { modules, features };
}

export async function saveTenantEntitlements(
  tenantId: string,
  updates: UpdateTenantEntitlementsBody,
): Promise<TenantEntitlementsResponse> {
  if (updates.modules) {
    await saveTenantModuleFlags(tenantId, updates.modules);
  }

  if (updates.features) {
    await saveTenantFeatureFlags(tenantId, updates.features);
  }

  return getTenantEntitlements(tenantId);
}
