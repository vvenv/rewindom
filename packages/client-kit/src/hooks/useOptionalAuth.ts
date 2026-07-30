import { useContext } from "react";

import { AuthContext, type AuthContextType } from "../contexts/AuthContext.js";

/**
 * 拿登录态但不要求 `AuthProvider`——没有 Provider 时返回 `null`。
 *
 * 给公开路由（`renderPublicRoutes`）用：官网页面在构建期预渲染时跑在裸 React 里，
 * 没有任何 App Provider，`useAuth` 会直接抛。调用方按「未登录」渲染即可，
 * 浏览器里 SPA 接管后会拿到真实登录态重渲染。
 */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}
