import { useEffect } from "react";

import { isMarketingPublicPath } from "@be-water/builtin/marketing/shared/site-locale.js";
import { useLocation } from "react-router";

import { AppHomeRedirect } from "./AppHomeRedirect.js";

/**
 * 未匹配任何路由时：
 * - 公开 CMS 路径 → 硬跳 SSR 文档（marketing 不再挂 React 公开路由）
 * - 其余 → 回落地页（与 `/app` 入口同一套解析）
 */
export function AppNotFoundRedirect() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (!isMarketingPublicPath(pathname)) return;
    window.location.replace(`${pathname}${search}${hash}`);
  }, [pathname, search, hash]);

  if (isMarketingPublicPath(pathname)) {
    return null;
  }

  return <AppHomeRedirect />;
}
