import {
  DEFAULT_HOME_PATH,
  resolveAppHomePath,
  type HomePathCandidate,
} from "../lib/resolve-app-home-path.js";

import { usePermissions } from "./usePermissions.js";
import { useTenantEntitlements } from "./useTenantEntitlements.js";

export {
  DEFAULT_HOME_PATH,
  EXAMPLE_HOME_PATH_CANDIDATES,
  resolveAppHomePath,
} from "../lib/resolve-app-home-path.js";
export type { HomePathCandidate } from "../lib/resolve-app-home-path.js";

/**
 * @param candidates 登录落地页候选（顺序即优先级）。须由组装层传入，
 *   且业务入口要带 `tenantModule`，否则禁用模块仍可能被当成默认路由。
 */
export function useAppHomePath(
  candidates: readonly HomePathCandidate[],
): string {
  const { data, isLoading: entitlementsLoading } = useTenantEntitlements();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  if (entitlementsLoading || permissionsLoading) {
    return DEFAULT_HOME_PATH;
  }

  return resolveAppHomePath(data, hasPermission, candidates) ?? DEFAULT_HOME_PATH;
}
