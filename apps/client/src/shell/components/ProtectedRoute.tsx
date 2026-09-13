import {
  useAuth,
  useTenantEntitlements,
  useDefaultHomePath,
  ExternalOrNavigate,
} from "@rewindom/client-kit";
import { isPlatformAdminActor } from "@rewindom/shared";
import { Spinner } from "@rewindom/ui/spinner";
import { Navigate, Outlet, useLocation } from "react-router";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
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

  if (isPlatformAdminActor(user?.actor_type)) {
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
