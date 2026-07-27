import { Spinner } from "@be-water/ui/spinner";
import { Navigate, Outlet } from "react-router";

import { usePermissions } from "../hooks/usePermissions.js";

import type { Permission } from "@be-water/shared";

interface PermissionRouteProps {
  permission?: Permission;
  anyOf?: readonly Permission[];
}

export function PermissionRoute({ permission, anyOf }: PermissionRouteProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAnyPermission([...anyOf])
      : true;

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
