/**
 * 「这个站开通会员付费了吗」—— 公开面的开关探测。
 *
 * 与 `site-member` 的同名函数分工一致：这是**旁路**查询，未绑定域名 / 未开通都只是
 * 「没有这个功能」，不该抛错让页面进错误态。会员付费还多一条前置：会员体系本身
 * 得先开着——没有会员就没有「谁在付费」可言。
 */

import { config } from "@be-water/server-kernel/lib/config.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../../site-member/shared/entitlements.js";
import { TENANT_SITE_BILLING_ENTITLEMENT } from "../shared/entitlements.js";

import type { HostTenantContext } from "@be-water/server-kernel/lib/host-tenant.js";

function resolveSingleTenantFallback(): string | null {
  return config.tenant.singleTenant ? DEFAULT_TENANT_ID : null;
}

export async function readSiteBillingEnabled(
  hostTenant: HostTenantContext | null,
): Promise<boolean> {
  const tenantId = hostTenant?.tenant_id ?? resolveSingleTenantFallback();
  if (!tenantId) return false;

  const [members, billing] = await Promise.all([
    isTenantModuleEnabled(tenantId, TENANT_SITE_MEMBER_ENTITLEMENT.key),
    isTenantModuleEnabled(tenantId, TENANT_SITE_BILLING_ENTITLEMENT.key),
  ]);
  return members && billing;
}
