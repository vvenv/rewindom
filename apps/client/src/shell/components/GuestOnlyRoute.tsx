import {
  ExternalOrNavigate,
  useAuth,
  useDefaultHomePath,
} from "@rewindom/client-kit";
import { Outlet } from "react-router";

export function GuestOnlyRoute() {
  const { isAuthenticated } = useAuth();
  const homePath = useDefaultHomePath();

  if (isAuthenticated) {
    return <ExternalOrNavigate to={homePath} replace />;
  }

  return <Outlet />;
}
