import { type Permission, type TenantEntitlementsResponse  } from "@be-water/shared";


type HomeEntitlements = Pick<
  TenantEntitlementsResponse,
  "modules" | "features"
>;

export interface HomePathCandidate {
  path: string;
  tenantModule?: string;
  permission?: Permission;
}

/**
 * 登录后落地页的候选顺序：取**第一个**租户已开通且当前用户有权限的路径。
 *
 * 上游只保留 `notes` 示例模块的入口。下游产品仓把自己的业务入口按优先级
 * 插在 `/notes` 之前——列表顺序即优先级，不要依赖模块注册顺序。
 */
const FALLBACK_HOME_CANDIDATES: readonly HomePathCandidate[] = [
  { path: "/notes", tenantModule: "notes", permission: "notes.read" },
];

/** 候选全部不可用时的兜底（租户什么业务模块都没开通时也要有地方去）。 */
export const DEFAULT_HOME_PATH = "/settings";

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

export function resolveAppHomePath(
  entitlements: HomeEntitlements | undefined,
  hasPermission: (permission: Permission) => boolean,
): string | null {
  for (const candidate of FALLBACK_HOME_CANDIDATES) {
    if (isHomeCandidateAvailable(candidate, entitlements, hasPermission)) {
      return candidate.path;
    }
  }

  return null;
}
