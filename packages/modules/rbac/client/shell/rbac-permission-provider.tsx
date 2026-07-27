import { useCallback, useMemo, type ReactNode } from "react";

import { api, PermissionsProvider, useAuth  } from "@be-water/client-kit";
import { hasAllPermissions as checkAllPermissions, hasAnyPermission as checkAnyPermission, hasPermission as checkPermission, type Permission } from "@be-water/shared";
import { useQuery } from "@tanstack/react-query";

export const PERMISSIONS_QUERY_KEY = ["permissions"] as const;

export function RbacPermissionProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: () => api.get<Permission[]>("/auth/permissions"),
    enabled: Boolean(user),
    staleTime: 5 * 60 * 1000,
  });

  const permissions = query.data ?? [];
  const isSystemAdmin = user?.is_system_admin;

  const hasPermission = useCallback(
    (permission: Permission): boolean =>
      checkPermission(isSystemAdmin, permissions, permission),
    [permissions, isSystemAdmin],
  );

  const hasAnyPermission = useCallback(
    (perms: readonly Permission[]): boolean =>
      checkAnyPermission(isSystemAdmin, permissions, perms),
    [permissions, isSystemAdmin],
  );

  const hasAllPermissions = useCallback(
    (perms: readonly Permission[]): boolean =>
      checkAllPermissions(isSystemAdmin, permissions, perms),
    [permissions, isSystemAdmin],
  );

  const value = useMemo(
    () => ({
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isLoading: authLoading || query.isLoading,
      isError: query.isError,
    }),
    [
      permissions,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      authLoading,
      query.isLoading,
      query.isError,
    ],
  );

  return <PermissionsProvider value={value}>{children}</PermissionsProvider>;
}
