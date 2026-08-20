import { AppError } from "@rewindom/server-kernel/lib/app-errors.js";
import { config } from "@rewindom/server-kernel/lib/config.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { SITE_MEMBER_ENTITLEMENT } from "../shared/entitlements.js";


import type { HostTenantContext } from "@rewindom/server-kernel/lib/host-tenant.js";

export interface SiteTenant {
  id: string;
  slug: string;
}

/**
 * 会员注册/登录发生在**未认证**的公开接口上，所属站点只能从请求 Host 推断。
 *
 * 产品主域隐式绑定默认租户；其它绑定 Host 同理。平台控制台 Host 无站点。
 *
 * 会员开关也在这里一并校验：这是所有公开会员接口的必经之路，放在这儿就不会有哪条
 * 接口漏检。开关是租户级的，而这些接口没有 `tenantContext`（未认证），套不了
 * `registerTenantGatedRoutes`。
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

  if (!(await isTenantModuleEnabled(tenant.id, SITE_MEMBER_ENTITLEMENT.key))) {
    throw new AppError({ code: "site_member.not_enabled", status: 403 });
  }

  return { id: tenant.id, slug: tenant.slug };
}

function resolveSingleTenantFallback(): string | null {
  return config.tenant.singleTenant ? DEFAULT_TENANT_ID : null;
}

/**
 * 这个 Host 后面有没有一个**开着会员功能**的站点。
 *
 * 两问合一：Host 绑没绑站点（平台控制台那个 Host 上没有），以及这个站点开没开会员。
 *
 * 与 `resolveSiteTenant` 分开：这条是页头 / 会员页渲染时的旁路判断，答案是「有没有
 * 会员入口」，不该抛错让页面出现错误态。
 */
export async function isSiteMemberEnabledForHost(
  hostTenant: HostTenantContext | null,
): Promise<boolean> {
  const tenantId = hostTenant?.tenant_id ?? resolveSingleTenantFallback();
  if (!tenantId) return false;
  return isTenantModuleEnabled(tenantId, SITE_MEMBER_ENTITLEMENT.key);
}
