import {
  ExternalOrNavigate,
  useAuth,
  useDefaultHomePath,
} from "@be-water/client-kit";
import { isPlatformAdminActor } from "@be-water/shared";
import { Spinner } from "@be-water/ui/spinner";
import { Navigate } from "react-router";

import { useAppHomePath } from "../hooks/useAppHomePath.js";

/**
 * 跳到当前用户的落地页（由 `HOME_PATH_CANDIDATES` + 租户开通情况解析）。
 *
 * 两个用处：未匹配路由的兜底，以及 `/app` 这个**稳定的控制台入口**——
 * 官网、邮件、外部文档不需要知道业务首页到底是哪个路径，指向 `/app` 即可。
 */
export function AppHomeRedirect() {
  const { user, isLoading } = useAuth();
  const homePath = useAppHomePath();
  const platformHome = useDefaultHomePath();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // 平台管理员绝不能落到 /dashboard 等租户壳，否则会挂载 AppLayout 并打租户 API。
  if (user && isPlatformAdminActor(user.actor_type)) {
    return <ExternalOrNavigate to={platformHome} replace />;
  }

  return <Navigate to={homePath} replace />;
}
