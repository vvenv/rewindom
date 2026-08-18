import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { TENANT_MODULES_STORAGE_KEY } from "@rewindom/builtin/platform/shared/tenant-modules.js";

/**
 * 这个站点开没开事件雷达。
 *
 * **未写入开关时算开通**，与 entitlement 的 `default_enabled: true` 一致——
 * shop 那边要求显式 `=== true`，因为它默认关闭；两处规则不同是各自的产品口径，
 * 不是抄漏了。
 *
 * 采集任务与公开 RSS 路由共用这一份：ingest 曾经自己写了一遍，
 * 两份判断迟早会分叉。
 */
export async function isEventsEnabled(tenantId: string): Promise<boolean> {
  const row = await prisma.tenantSetting.findFirst({
    where: withTenantScope(tenantId, { key: TENANT_MODULES_STORAGE_KEY }),
    select: { value: true },
  });
  return isEventsModuleEnabled(row?.value);
}

/** 纯判定，供批量场景（一次查回多个站点的设置）复用。 */
export function isEventsModuleEnabled(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return true;
  }
  return (value as Record<string, unknown>).events !== false;
}
