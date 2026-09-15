import { configureAuthTokenStore } from "../auth-store.js";

import { clearStoredAuthTokens } from "./auth-token-storage.js";

/**
 * 工作台默认会话走 HttpOnly cookie；tokenStore 为 no-op。
 * 仍清一次遗留 localStorage，避免升级后残留误导。
 */
configureAuthTokenStore({
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {
    // cookies set by Set-Cookie
  },
  clearTokens: () => {
    clearStoredAuthTokens();
  },
});
