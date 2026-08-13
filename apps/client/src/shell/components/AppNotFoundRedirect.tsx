import { useEffect } from "react";

import { isMarketingPublicPath } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  isPlatformConsoleOrigin,
  PLATFORM_HOME_PATH,
  usePublicConfig,
} from "@rewindom/client-kit";
import { Navigate, useLocation } from "react-router";

import { AppHomeRedirect } from "./AppHomeRedirect.js";

/**
 * 未匹配任何路由时：
 * - 平台控制台 Host → `/platform`（该 Host 不走 Marketing SSR；对 `/` 硬跳自己会死循环）
 * - 其它 Host 的公开 CMS 路径 → 硬跳 SSR 文档（marketing 不再挂 React 公开路由）
 * - 其余 → 回落地页（与 `/app` 入口同一套解析）
 */
export function AppNotFoundRedirect() {
  const { pathname, search, hash } = useLocation();
  const { data, isFetched } = usePublicConfig();
  const onConsole =
    isFetched &&
    isPlatformConsoleOrigin(data.platform_url, window.location.origin);

  useEffect(() => {
    if (!isMarketingPublicPath(pathname)) return;
    if (!isFetched || onConsole) return;

    const target = `${pathname}${search}${hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    // 已是同一 URL（例如误把 SPA 接到了官网路径）时再 replace 只会空转
    if (target === current) return;

    window.location.replace(target);
  }, [pathname, search, hash, isFetched, onConsole]);

  if (isMarketingPublicPath(pathname)) {
    if (!isFetched) return null;
    if (onConsole) {
      return <Navigate to={PLATFORM_HOME_PATH} replace />;
    }
    return null;
  }

  return <AppHomeRedirect />;
}
