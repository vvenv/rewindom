import {
  useAuth,
  useTenantEntitlements,
  useDefaultHomePath,
  ExternalOrNavigate,
  isTenantAccessToken,
} from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { Spinner } from "@be-water/ui/spinner";
import { Navigate, Outlet, useLocation } from "react-router";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user, accessToken } = useAuth();
  const location = useLocation();
  const entitlements = useTenantEntitlements();
  const platformHome = useDefaultHomePath();

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

  // Prefer JWT actor (matches Authorization); AuthContext.user can lag after token swap.
  if (
    isPlatformAdminActor(user?.actor_type) ||
    (accessToken !== null && !isTenantAccessToken(accessToken))
  ) {
    return <ExternalOrNavigate to={platformHome} replace />;
  }

  if (entitlements.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <Outlet />;
}
