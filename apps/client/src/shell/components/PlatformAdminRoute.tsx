import {
  ExternalOrNavigate,
  useAuth,
  useDefaultHomePath,
  usePublicConfig,
} from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { Spinner } from "@be-water/ui/spinner";
import { Navigate, Outlet, useLocation } from "react-router";

export function PlatformAdminRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  // 被挡下的一定是租户用户，这里解析出来就是租户工作台入口
  const homePath = useDefaultHomePath();
  const location = useLocation();
  const {
    data: { bound_tenant },
  } = usePublicConfig();

  if (bound_tenant) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user || !isPlatformAdminActor(user.actor_type)) {
    return <ExternalOrNavigate to={homePath} replace />;
  }

  return <Outlet />;
}
