import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useAuth } from "./hooks/useAuth.js";

import type { Permission } from "@rewindom/shared";


export type { Permission };

export interface PermissionsValue {
  permissions: readonly Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (perms: readonly Permission[]) => boolean;
  hasAllPermissions: (perms: readonly Permission[]) => boolean;
  isLoading: boolean;
  isError: boolean;
}

const PermissionContext = createContext<PermissionsValue | null>(null);

/**
 * Registers a concrete permission checker (e.g. module-rbac PBAC).
 * Business modules consume {@link usePermissions} instead of importing RBAC.
 */
export function PermissionsProvider({
  value,
  children,
}: {
  value: PermissionsValue;
  children: ReactNode;
}): ReactNode {
  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/** Mirrors server {@link AuthenticatedOnlyAuthz} when module-rbac is not mounted. */
function useAuthenticatedOnlyPermissions(): PermissionsValue {
  const { user, isLoading: authLoading } = useAuth();

  const hasPermission = useCallback(
    (_permission: Permission): boolean => Boolean(user),
    [user],
  );

  const hasAnyPermission = useCallback(
    (_perms: readonly Permission[]): boolean => Boolean(user),
    [user],
  );

  const hasAllPermissions = useCallback(
    (_perms: readonly Permission[]): boolean => Boolean(user),
    [user],
  );

  return useMemo(
    () => ({
      permissions: [] as const,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isLoading: authLoading,
      isError: false,
    }),
    [authLoading, hasAllPermissions, hasAnyPermission, hasPermission],
  );
}

export function usePermissions(): PermissionsValue {
  const injected = useContext(PermissionContext);
  const fallback = useAuthenticatedOnlyPermissions();
  return injected ?? fallback;
}
