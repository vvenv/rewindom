import {
  DEFAULT_HOME_PATH,
  resolveAppHomePath,
} from "../lib/resolve-app-home-path.js";

import { usePermissions } from "./usePermissions.js";
import { useTenantEntitlements } from "./useTenantEntitlements.js";


export {
  DEFAULT_HOME_PATH,
  resolveAppHomePath,
} from "../lib/resolve-app-home-path.js";
export type { HomePathCandidate } from "../lib/resolve-app-home-path.js";

export function useAppHomePath(): string {
  const { data, isLoading: entitlementsLoading } = useTenantEntitlements();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();

  if (entitlementsLoading || permissionsLoading) {
    return DEFAULT_HOME_PATH;
  }

  return resolveAppHomePath(data, hasPermission) ?? DEFAULT_HOME_PATH;
}
