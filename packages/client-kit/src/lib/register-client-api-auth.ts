import { configureAuthTokenStore } from "../auth-store.js";

import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAuthTokens,
} from "./auth-token-storage.js";

configureAuthTokenStore({
  getAccessToken: getStoredAccessToken,
  getRefreshToken: getStoredRefreshToken,
  setTokens: setStoredAuthTokens,
  clearTokens: clearStoredAuthTokens,
});
