import type { ReactNode } from "react";

import { Outlet } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";


/**
 * 公开路由（官网 / 租户站点前台）的 Provider 层。
 *
 * 做成 layout route 而不是包在 `<Routes>` 外面：`renderPublicRoutes` 交出来的是一串
 * `<Route>`，只有 pathless layout route 能给它们套上下文而不影响路径匹配。
 */
export function PublicProviders(): ReactNode {
  const { shellContributions } = useAppShellConfig();

  return shellContributions.publicProviders.reduceRight<ReactNode>(
    (acc, Provider) => <Provider>{acc}</Provider>,
    <Outlet />,
  );
}
