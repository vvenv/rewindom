/**
 * 本租户已开通哪些 entitlement —— 贡献段的渲染闸门。
 *
 * 贡献段的渲染器是**进程级**注册的（模块装进这次构建就有），而开通与否是**租户级**的，
 * 所以公开渲染路径必须把这份集合带上（`SectionRenderContext.enabledEntitlements`）。
 * 漏传的后果是贡献段一律不渲染——少了而不是多了，这个方向是安全的。
 */

import { isTenantModuleEnabled } from "../../platform/server/services/tenant-module.service.js";
import { listPageTemplateKinds } from "../shared/page-templates.js";
import { allSectionDefinitions } from "../shared/section-schema.js";
import { contributedNavEntitlementKeys } from "../shared/site-nav.js";

/**
 * 只查**真的有人依赖它**的那几个 entitlement，不是把租户的开关表整个拉出来：
 * 贡献段、模板页、导航源都没有声明时这里一次查询都不发。
 */
export async function resolveSectionEntitlements(
  tenantId: string,
): Promise<ReadonlySet<string>> {
  const keys = [
    ...new Set(
      [
        ...allSectionDefinitions().map((def) => def.entitlement),
        ...listPageTemplateKinds().map((template) => template.entitlement),
        ...contributedNavEntitlementKeys(),
      ].filter((key): key is string => Boolean(key)),
    ),
  ];
  if (keys.length === 0) return new Set();

  const flags = await Promise.all(
    keys.map(async (key) => [key, await isTenantModuleEnabled(tenantId, key)] as const),
  );
  return new Set(flags.filter(([, on]) => on).map(([key]) => key));
}
