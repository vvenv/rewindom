import { usePermissions, useAuth, useDefaultHomePath  } from "@be-water/client-kit";
import { Navigate, Outlet, useLocation } from "react-router";


export function SuperUserRoute() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const homePath = useDefaultHomePath();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 管理区总闸：具备任一管理类权限即可进入，具体页面再由各自的 PermissionRoute 收窄
  // （`/users` 要 users.read，`/roles` 要 roles.read）。这里若只认 roles.*，
  // 仅有 users.read 的用户会看得见「用户管理」导航却被弹回首页。
  const canAccess =
    user?.is_system_admin ||
    hasAnyPermission([
      "users.read",
      "users.write",
      "roles.read",
      "roles.write",
      "roles.assign",
    ]);

  if (!canAccess) {
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
