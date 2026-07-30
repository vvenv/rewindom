import { useAuth } from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { Navigate, Outlet } from "react-router";


export function GuestOnlyRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return (
      <Navigate
        to={
          user && isPlatformAdminActor(user.actor_type) ? "/platform" : "/app"
        }
        replace
      />
    );
  }

  return <Outlet />;
}
