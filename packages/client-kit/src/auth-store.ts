import type { AuthTokens } from "@be-water/shared";

export interface AuthTokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: AuthTokens): void;
  clearTokens(): void;
}

const noopStore: AuthTokenStore = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  clearTokens: () => {},
};

let authTokenStore: AuthTokenStore = noopStore;

export function configureAuthTokenStore(store: AuthTokenStore): void {
  authTokenStore = store;
}

export function getAccessToken(): string | null {
  return authTokenStore.getAccessToken();
}

export function getRefreshToken(): string | null {
  return authTokenStore.getRefreshToken();
}

export function setAuthTokens(tokens: AuthTokens): void {
  authTokenStore.setTokens(tokens);
}

export function clearAuthTokens(): void {
  authTokenStore.clearTokens();
}
