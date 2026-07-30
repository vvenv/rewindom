import { Navigate } from "react-router";

import { useAppHomePath } from "../hooks/useAppHomePath.js";

/**
 * 跳到当前用户的落地页（由 `HOME_PATH_CANDIDATES` + 租户开通情况解析）。
 *
 * 两个用处：未匹配路由的兜底，以及 `/app` 这个**稳定的控制台入口**——
 * 官网、邮件、外部文档不需要知道业务首页到底是哪个路径，指向 `/app` 即可。
 */
export function AppHomeRedirect() {
  const homePath = useAppHomePath();
  return <Navigate to={homePath} replace />;
}
