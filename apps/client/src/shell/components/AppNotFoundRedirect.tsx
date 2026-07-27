import { useAppHomePath } from "@be-water/client-kit";
import { Navigate } from "react-router";


export function AppNotFoundRedirect() {
  const homePath = useAppHomePath();
  return <Navigate to={homePath} replace />;
}
