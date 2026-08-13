import type { AuthTokenStore } from "@rewindom/client-kit";

/**
 * Cookie 模式下 token 在 HttpOnly cookie 里，JS 不可读。
 * 仍提供 no-op store，满足 createApiClient 的接口；真伪会话以 `/me` 为准。
 */
export const siteMemberTokenStore: AuthTokenStore = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {
    // cookies set by Set-Cookie
  },
  clearTokens: () => {
    // cookies cleared by logout endpoint
  },
};

/** 会员会话失效事件；与工作台的 `authLogout` 分开，否则会互相踢下线。 */
export const MEMBER_TOKEN_REFRESHED_EVENT = "siteMemberTokenRefreshed";
export const MEMBER_AUTH_LOGOUT_EVENT = "siteMemberAuthLogout";
