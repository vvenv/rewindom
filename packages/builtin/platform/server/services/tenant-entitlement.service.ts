import { emitDetachedDomainEventSafe } from "@rewindom/server-kernel/runtime/domain-event-emit.js";
import { type TenantEntitlementsResponse } from "@rewindom/shared";

import { type UpdateTenantEntitlementsBody } from "../../shared/index.js";

import {
  getTenantFeatureFlags,
  saveTenantFeatureFlags,
} from "./tenant-feature.service.js";
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
  // 保存前的样子：事件要报的是**增量**（这一次由关变开的），不是「现在开着的」
  const before = await getTenantEntitlements(tenantId);

  if (updates.modules) {
    await saveTenantModuleFlags(tenantId, updates.modules);
  }

  if (updates.features) {
    await saveTenantFeatureFlags(tenantId, updates.features);
  }

  const saved = await getTenantEntitlements(tenantId);
  await emitDetachedDomainEventSafe(undefined, "tenant.entitlements.updated", {
    tenant_id: tenantId,
    enabled_keys: newlyEnabledKeys(before, saved),
  });
  return saved;
}

/** 两次快照里由 false 变 true 的 key（模块开关与套餐 flag 同一个平面）。 */
function newlyEnabledKeys(
  before: TenantEntitlementsResponse,
  after: TenantEntitlementsResponse,
): string[] {
  const keys: string[] = [];
  for (const group of ["modules", "features"] as const) {
    for (const [key, enabled] of Object.entries(after[group])) {
      if (enabled && before[group][key] !== true) keys.push(key);
    }
  }
  return keys;
}
