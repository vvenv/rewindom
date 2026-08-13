import { createApiClient } from "@rewindom/client-kit";

import {
  MEMBER_AUTH_LOGOUT_EVENT,
  MEMBER_TOKEN_REFRESHED_EVENT,
  siteMemberTokenStore,
} from "./site-member-session.js";

/**
 * 会员专用 API 实例：HttpOnly cookie 会话、独立刷新端点、独立失效事件。
 *
 * 不能用默认的 `api`：它读工作台 Bearer token，并在 401 时派发 `authLogout`
 *（工作台 AuthContext 收到会 `location.href = "/login"`，把访客踢出站点前台）。
 */
export const siteMemberApi = createApiClient({
  tokenStore: siteMemberTokenStore,
  refreshPath: "/member/refresh",
  refreshBodyKey: "refresh_token",
  tokenRefreshedEvent: MEMBER_TOKEN_REFRESHED_EVENT,
  authLogoutEvent: MEMBER_AUTH_LOGOUT_EVENT,
  authMode: "cookie",
  credentials: "include",
});

export const SITE_MEMBER_API_BASE = "/member";
