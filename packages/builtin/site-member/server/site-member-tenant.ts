import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { TENANT_SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";

import type { HostTenantContext } from "@be-water/server-kernel/lib/host-tenant.js";

export interface SiteTenant {
  id: string;
  slug: string;
}

/**
 * 会员注册/登录发生在**未认证**的公开接口上，所属站点只能从请求 Host 推断。
 *
 * 产品主域隐式绑定默认租户；其它绑定 Host 同理。平台控制台 Host 无站点。
 */
export async function resolveSiteTenant(
  hostTenant: HostTenantContext | null,
): Promise<SiteTenant> {
  const tenantId = hostTenant?.tenant_id ?? resolveSingleTenantFallback();
  if (!tenantId) {
    throw new AppError({ code: "site_member.site_unbound", status: 404 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant || tenant.status !== "active") {
    throw new AppError({ code: "site_member.site_unavailable", status: 403 });
  }

  await assertSiteMembersEnabled(tenant.id);

  return { id: tenant.id, slug: tenant.slug };
}

function resolveSingleTenantFallback(): string | null {
  return config.tenant.singleTenant ? DEFAULT_TENANT_ID : null;
}

/** 会员能力是租户开关；关闭时连注册入口都不该存在。 */
export async function assertSiteMembersEnabled(
  tenantId: string,
): Promise<void> {
  const enabled = await isTenantModuleEnabled(
    tenantId,
    TENANT_SITE_MEMBER_ENTITLEMENT.key,
  );
  if (!enabled) {
    throw new AppError({ code: "site_member.not_enabled", status: 403 });
  }
}

/**
 * 站点前台探测「本站是否有会员体系」。
 *
 * 与 `resolveSiteTenant` 分开：这条是页头渲染时的旁路查询，未绑定域名 / 未开通
 * 都只是「没有会员入口」，不该抛错让页头出现错误态。
 */
export async function readSiteMembersEnabled(
  hostTenant: HostTenantContext | null,
): Promise<boolean> {
  const tenantId = hostTenant?.tenant_id ?? resolveSingleTenantFallback();
  if (!tenantId) return false;
  return isTenantModuleEnabled(tenantId, TENANT_SITE_MEMBER_ENTITLEMENT.key);
}
