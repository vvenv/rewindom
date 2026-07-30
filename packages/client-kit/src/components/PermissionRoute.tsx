import { Spinner } from "@be-water/ui/spinner";
import { Navigate, Outlet } from "react-router";

import { useDefaultHomePath } from "../hooks/useDefaultHomePath.js";
import { usePermissions } from "../hooks/usePermissions.js";

import type { Permission } from "@be-water/shared";

interface PermissionRouteProps {
  permission?: Permission;
  anyOf?: readonly Permission[];
}

export function PermissionRoute({ permission, anyOf }: PermissionRouteProps) {
  const { hasPermission, hasAnyPermission, isLoading } = usePermissions();
  // 本组件平台侧路由也在用（如 `/platform/admins`），所以兜底要按身份区分
  const homePath = useDefaultHomePath();

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
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
