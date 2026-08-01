import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const OAuthCallback = lazy(() =>
  import("./pages/oauth-callback.js").then((module) => ({
    default: module.OAuthCallback,
  })),
);

/** 无守卫公开路由（OAuth 回调需在已有 localStorage Token 时仍可落地换票） */
export function renderAppShellPublicRoutes(): ReactNode {
  return <Route path="/auth/oauth/callback" element={<OAuthCallback />} />;
}
