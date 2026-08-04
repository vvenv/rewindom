import { getStoredAccessToken } from "../lib/auth-token-storage.js";
import {
  isTenantAccessToken,
  readActorTypeFromAccessToken,
} from "../tenant-query-scope.js";

import { useOptionalAuth } from "./useOptionalAuth.js";

/**
 * 租户业务 API（`/api/settings/*` 等）只应在租户用户 JWT 下请求。
 *
 * 必须读 **即将发出的 access token**（与 `Authorization` 头一致），不能只信
 * `AuthContext.user`：多标签页换号、impersonation 恢复等场景下，React 里的
 * `user.actor_type` 可能仍是 `tenant_user`，而 localStorage 已是平台管理员
 * JWT——此时打 settings 会立刻 403（`auth.platform_admin_tenant_api_denied`）
 * 并在重挂载下刷屏。
 */
export function useTenantApiEnabled(enabled = true): boolean {
  const auth = useOptionalAuth();
  if (!enabled) return false;
  if (!auth || auth.isLoading) return false;

  // Prefer in-memory token from AuthContext; fall back to storage (same store).
  const token = auth.accessToken ?? getStoredAccessToken();
  if (!isTenantAccessToken(token)) return false;

  // If /auth/me already resolved and disagrees, stay off (belt and suspenders).
  const contextActor = auth.user?.actor_type;
  const tokenActor = readActorTypeFromAccessToken(token);
  if (contextActor && tokenActor && contextActor !== tokenActor) {
    return false;
  }

  return true;
}
