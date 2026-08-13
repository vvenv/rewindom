import { type Permission, type TenantEntitlementsResponse } from "@be-water/shared";

type HomeEntitlements = Pick<TenantEntitlementsResponse, "modules" | "features">;

export interface HomePathCandidate {
  path: string;
  /** 对应 `tenantEntitlements[].key`；禁用时该候选不可作为默认路由。 */
  tenantModule?: string;
  permission?: Permission;
}

/**
 * rewindom 示例业务入口。产品仓应在 `apps/client` 组装层覆盖
 * `homePathCandidates`，把业务首页插在前面，并去掉未启用的示例模块。
 *
 * 列表顺序即优先级；禁用模块（`entitlements.modules[id] === false`）会被跳过。
 */
export const EXAMPLE_HOME_PATH_CANDIDATES: readonly HomePathCandidate[] = [
  { path: "/app/notes", tenantModule: "notes", permission: "notes.read" },
];

/**
 * 候选全部不可用时的兜底（租户什么业务模块都没开通时也要有地方去）。
 *
 * 曾经是 `/app/settings`——那条路由随品牌页一起没了（品牌并进站点外观）。
 * 仪表盘是唯一一个不挂在任何业务模块下、也不需要额外权限的页。
 */
export const DEFAULT_HOME_PATH = "/app/dashboard";

function isTenantModuleEnabled(
  entitlements: HomeEntitlements | undefined,
  moduleId: string,
): boolean {
  return entitlements?.modules[moduleId] !== false;
}

function isHomeCandidateAvailable(
  candidate: HomePathCandidate,
  entitlements: HomeEntitlements | undefined,
  hasPermission: (permission: Permission) => boolean,
): boolean {
  if (
    candidate.tenantModule &&
    !isTenantModuleEnabled(entitlements, candidate.tenantModule)
  ) {
    return false;
  }

  if (candidate.permission && !hasPermission(candidate.permission)) {
    return false;
  }

  return true;
}

/**
 * 登录后落地页：取**第一个**租户已开通且当前用户有权限的候选路径。
 *
 * @param candidates 由产品组装层提供；缺 `tenantModule` 的候选在模块被禁用时仍会命中——升级产品仓时务必补上。
 */
export function resolveAppHomePath(
  entitlements: HomeEntitlements | undefined,
  hasPermission: (permission: Permission) => boolean,
  candidates: readonly HomePathCandidate[],
): string | null {
  for (const candidate of candidates) {
    if (isHomeCandidateAvailable(candidate, entitlements, hasPermission)) {
      return candidate.path;
    }
  }

  return null;
}
