import { lazy, type ReactNode } from "react";

import { Route } from "react-router";

const OAuthCallback = lazy(() =>
  import("./pages/oauth-callback.js").then((module) => ({
    default: module.OAuthCallback,
  })),
);

const TwoFactorChallengePage = lazy(() =>
  import("./pages/two-factor-challenge.js").then((module) => ({
    default: module.TwoFactorChallengePage,
  })),
);

/** 无守卫公开路由（OAuth / 2FA 挑战落地） */
export function renderAppShellPublicRoutes(): ReactNode {
  return (
    <>
      <Route path="/auth/oauth/callback" element={<OAuthCallback />} />
      <Route path="/auth/2fa" element={<TwoFactorChallengePage />} />
    </>
  );
}
