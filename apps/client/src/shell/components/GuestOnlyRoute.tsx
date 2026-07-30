import { useAuth, useDefaultHomePath } from "@be-water/client-kit";
import { Navigate, Outlet } from "react-router";

export function GuestOnlyRoute() {
  const { isAuthenticated } = useAuth();
  const homePath = useDefaultHomePath();

  if (isAuthenticated) {
    return <Navigate to={homePath} replace />;
  }

  return <Outlet />;
}
