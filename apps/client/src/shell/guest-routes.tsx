import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const Login = lazy(() =>
  import("./pages/login.js").then((module) => ({
    default: module.Login,
  })),
);

const Register = lazy(() =>
  import("./pages/register.js").then((module) => ({
    default: module.Register,
  })),
);

export function renderAppShellGuestRoutes(): ReactNode {
  return (
    <>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </>
  );
}
