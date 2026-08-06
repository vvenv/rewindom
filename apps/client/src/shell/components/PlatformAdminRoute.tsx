import {
  buildPlatformConsoleUrl,
  ExternalOrNavigate,
  isPlatformConsoleOrigin,
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
    data: { bound_tenant, platform_url },
  } = usePublicConfig();

  /*
   * 这个 Host 是租户站，控制台不在这儿。
   *
   * 之前一律 `Navigate to="/"`——访问 `/platform` 的人被静默丢到官网首页，看起来
   * 就是「打不开」。既然 `platform_url` 就在公开配置里，直接把人送到控制台那个
   * origin 去。只有没配 `PLATFORM_URL`（控制台与应用同源）时才没有别处可去，
   * 那种情况才退回首页，否则会原地打转。
   */
  if (bound_tenant) {
    return isPlatformConsoleOrigin(platform_url, window.location.origin) ? (
      <Navigate to="/" replace />
    ) : (
      <ExternalOrNavigate to={buildPlatformConsoleUrl(platform_url)} replace />
    );
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
