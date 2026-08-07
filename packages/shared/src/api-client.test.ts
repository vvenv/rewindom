import { describe, it, expect } from "vitest";

import {
  API_CLIENT_PERMISSIONS,
  API_CLIENT_ROLE,
  API_KEY_PREFIX,
  isApiKeyBlockedPath,
  isApiKeyToken,
} from "./api-client.js";

describe("api-client", () => {
  describe("常量契约", () => {
    it("API_CLIENT_ROLE 固定值", () => {
      expect(API_CLIENT_ROLE).toBe("API_CLIENT");
    });

    it("API_KEY_PREFIX 固定值(改动会让现有 key 失效)", () => {
      expect(API_KEY_PREFIX).toBe("rga_");
    });

    it("API_CLIENT_PERMISSIONS 是只读数组且非空", () => {
      expect(Array.isArray(API_CLIENT_PERMISSIONS)).toBe(true);
      expect(API_CLIENT_PERMISSIONS.length).toBeGreaterThan(0);
    });
  });

  describe("isApiKeyToken", () => {
    it("rga_ 前缀返回 true", () => {
      expect(isApiKeyToken("rga_abcdef123456")).toBe(true);
      expect(isApiKeyToken("rga_")).toBe(true);
    });

    it("非 rga_ 前缀返回 false", () => {
      expect(isApiKeyToken("Bearer abc")).toBe(false);
      expect(isApiKeyToken("jwt.token.here")).toBe(false);
      expect(isApiKeyToken("RGA_uppercase")).toBe(false); // 大小写敏感
      expect(isApiKeyToken(" rga_leading_space")).toBe(false);
    });

    it("空字符串返回 false", () => {
      expect(isApiKeyToken("")).toBe(false);
    });
  });

  describe("isApiKeyBlockedPath", () => {
    it("阻断 /api/settings /api/users /api/platform /api/auth 前缀", () => {
      expect(isApiKeyBlockedPath("/api/settings")).toBe(true);
      expect(isApiKeyBlockedPath("/api/settings/appearance")).toBe(true);
      expect(isApiKeyBlockedPath("/api/users")).toBe(true);
      expect(isApiKeyBlockedPath("/api/users/123")).toBe(true);
      expect(isApiKeyBlockedPath("/api/platform/tenants")).toBe(true);
      expect(isApiKeyBlockedPath("/api/auth/login")).toBe(true);
    });

    it("放行业务路径", () => {
      expect(isApiKeyBlockedPath("/api/documents")).toBe(false);
      expect(isApiKeyBlockedPath("/api/products")).toBe(false);
      expect(isApiKeyBlockedPath("/api/notes")).toBe(false);
      expect(isApiKeyBlockedPath("/api/analyses")).toBe(false);
    });

    it("根路径放行", () => {
      expect(isApiKeyBlockedPath("/")).toBe(false);
      expect(isApiKeyBlockedPath("")).toBe(false);
    });
  });
});
