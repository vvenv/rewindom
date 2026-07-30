import {
  useAuth,
  useTenantEntitlements,
  PLATFORM_HOME_PATH,
} from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { Spinner } from "@be-water/ui/spinner";
import { Navigate, Outlet, useLocation } from "react-router";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  const entitlements = useTenantEntitlements(isAuthenticated);

  if (isLoading || entitlements.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user && isPlatformAdminActor(user.actor_type)) {
    return <Navigate to={PLATFORM_HOME_PATH} replace />;
  }

  return <Outlet />;
}
