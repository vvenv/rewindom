import { STORAGE_PREFIX, type AuthTokens } from "@be-water/shared";

import type { AuthTokenStore } from "@be-water/client-kit";

/**
 * 会员 token 与工作台 token 用**不同的 key**。
 *
 * 同一浏览器上完全可能既登了工作台（运营者）又登了会员（自己试站点）；
 * 复用 `be-water_access_token` 会让后登的一方把前一方顶掉。
 */
export const MEMBER_ACCESS_TOKEN_KEY = `${STORAGE_PREFIX}_member_access_token`;
export const MEMBER_REFRESH_TOKEN_KEY = `${STORAGE_PREFIX}_member_refresh_token`;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 隐私模式 / 配额用尽：会话退化为单次请求内有效，不阻塞交互
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getMemberAccessToken(): string | null {
  return read(MEMBER_ACCESS_TOKEN_KEY);
}

export function getMemberRefreshToken(): string | null {
  return read(MEMBER_REFRESH_TOKEN_KEY);
}

export function setMemberTokens(tokens: AuthTokens): void {
  write(MEMBER_ACCESS_TOKEN_KEY, tokens.accessToken);
  write(MEMBER_REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearMemberTokens(): void {
  remove(MEMBER_ACCESS_TOKEN_KEY);
  remove(MEMBER_REFRESH_TOKEN_KEY);
}

export function hasMemberTokens(): boolean {
  return Boolean(getMemberAccessToken()) && Boolean(getMemberRefreshToken());
}

export const siteMemberTokenStore: AuthTokenStore = {
  getAccessToken: getMemberAccessToken,
  getRefreshToken: getMemberRefreshToken,
  setTokens: setMemberTokens,
  clearTokens: clearMemberTokens,
};

/** 会员会话失效事件；与工作台的 `authLogout` 分开，否则会互相踢下线。 */
export const MEMBER_TOKEN_REFRESHED_EVENT = "siteMemberTokenRefreshed";
export const MEMBER_AUTH_LOGOUT_EVENT = "siteMemberAuthLogout";
