import { STORAGE_PREFIX, type AuthTokens  } from "@be-water/shared";


export const ACCESS_TOKEN_KEY = `${STORAGE_PREFIX}_access_token`;
export const REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}_refresh_token`;

function readToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore localStorage errors (e.g., quota exceeded, private browsing)
  }
}

function removeToken(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getStoredAccessToken(): string | null {
  return readToken(ACCESS_TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return readToken(REFRESH_TOKEN_KEY);
}

export function setStoredAuthTokens(tokens: AuthTokens): void {
  writeToken(ACCESS_TOKEN_KEY, tokens.accessToken);
  writeToken(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearStoredAuthTokens(): void {
  removeToken(ACCESS_TOKEN_KEY);
  removeToken(REFRESH_TOKEN_KEY);
}

export function hasStoredAuthTokens(): boolean {
  return Boolean(getStoredAccessToken()) && Boolean(getStoredRefreshToken());
}
