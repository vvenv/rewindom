import { STORAGE_PREFIX, type AuthTokens } from "@rewindom/shared";
import { describe, it, expect, beforeEach } from "vitest";

import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  hasStoredAuthTokens,
  setStoredAuthTokens,
} from "./auth-token-storage.js";

describe("auth-token-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("key 名(与 STORAGE_PREFIX 一致)", () => {
    it("ACCESS_TOKEN_KEY 以 STORAGE_PREFIX 拼接", () => {
      expect(ACCESS_TOKEN_KEY).toBe(`${STORAGE_PREFIX}_access_token`);
    });

    it("REFRESH_TOKEN_KEY 以 STORAGE_PREFIX 拼接", () => {
      expect(REFRESH_TOKEN_KEY).toBe(`${STORAGE_PREFIX}_refresh_token`);
    });
  });

  describe("set / get", () => {
    it("setStoredAuthTokens 写入 access + refresh", () => {
      setStoredAuthTokens({ accessToken: "at-1", refreshToken: "rt-1" });
      expect(getStoredAccessToken()).toBe("at-1");
      expect(getStoredRefreshToken()).toBe("rt-1");
    });

    it("未写入时 get 返回 null", () => {
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
    });
  });

  describe("hasStoredAuthTokens", () => {
    it("两个 token 都有返回 true", () => {
      setStoredAuthTokens({ accessToken: "at", refreshToken: "rt" });
      expect(hasStoredAuthTokens()).toBe(true);
    });

    it("只有 access 返回 false", () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, "at");
      expect(hasStoredAuthTokens()).toBe(false);
    });

    it("只有 refresh 返回 false", () => {
      localStorage.setItem(REFRESH_TOKEN_KEY, "rt");
      expect(hasStoredAuthTokens()).toBe(false);
    });

    it("都没有返回 false", () => {
      expect(hasStoredAuthTokens()).toBe(false);
    });
  });

  describe("clearStoredAuthTokens", () => {
    it("清除两个 token", () => {
      setStoredAuthTokens({ accessToken: "at", refreshToken: "rt" });
      clearStoredAuthTokens();
      expect(getStoredAccessToken()).toBeNull();
      expect(getStoredRefreshToken()).toBeNull();
      expect(hasStoredAuthTokens()).toBe(false);
    });

    it("未写入时 clear 不报错", () => {
      expect(() => clearStoredAuthTokens()).not.toThrow();
    });
  });

  describe("AuthTokens 类型契约", () => {
    it("setStoredAuthTokens 接受符合 AuthTokens 的入参", () => {
      const tokens: AuthTokens = {
        accessToken: "access",
        refreshToken: "refresh",
      };
      setStoredAuthTokens(tokens);
      expect(hasStoredAuthTokens()).toBe(true);
    });
  });
});
