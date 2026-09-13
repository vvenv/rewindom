import { isTenantUserActor } from "@rewindom/shared";

import { useOptionalAuth } from "./useOptionalAuth.js";

/**
 * 租户业务 API（`/api/settings/*` 等）只应在租户用户会话下请求。
 *
 * Cookie 模式下以 AuthContext.user.actor_type 为准（/auth/me 已解析）。
 */
export function useTenantApiEnabled(enabled = true): boolean {
  const auth = useOptionalAuth();
  if (!enabled) return false;
  if (!auth || auth.isLoading) return false;
  if (!auth.isAuthenticated || !auth.user) return false;
  return isTenantUserActor(auth.user.actor_type);
}
