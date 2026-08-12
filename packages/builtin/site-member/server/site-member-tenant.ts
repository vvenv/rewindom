import { AppError } from "@be-water/server-kernel/lib/app-errors.js";
import { config } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@be-water/shared";


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

  return { id: tenant.id, slug: tenant.slug };
}

function resolveSingleTenantFallback(): string | null {
  return config.tenant.singleTenant ? DEFAULT_TENANT_ID : null;
}

/**
 * 这个 Host 后面有没有一个站点。
 *
 * 会员体系本身不再有开关（每个站点都具备），所以这里只剩「Host 绑没绑站点」这一问
 * ——平台控制台那个 Host 上没有站点，会员入口自然也不该出现。
 *
 * 与 `resolveSiteTenant` 分开：这条是页头渲染时的旁路查询，未绑定只是「没有会员入口」，
 * 不该抛错让页头出现错误态。
 */
export function hasSiteForHost(
  hostTenant: HostTenantContext | null,
): boolean {
  return Boolean(hostTenant?.tenant_id ?? resolveSingleTenantFallback());
}
