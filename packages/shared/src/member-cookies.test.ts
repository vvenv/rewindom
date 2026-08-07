import { describe, it, expect } from "vitest";

import { STORAGE_PREFIX } from "./branding.js";
import {
  MEMBER_ACCESS_COOKIE,
  MEMBER_ACCESS_COOKIE_MAX_AGE,
  MEMBER_REFRESH_COOKIE,
  MEMBER_REFRESH_COOKIE_MAX_AGE,
} from "./member-cookies.js";

describe("member-cookies", () => {
  describe("cookie 名(与工作台 localStorage 隔离)", () => {
    it("access cookie 名以 STORAGE_PREFIX 拼接", () => {
      expect(MEMBER_ACCESS_COOKIE).toBe(`${STORAGE_PREFIX}_member_access`);
    });

    it("refresh cookie 名以 STORAGE_PREFIX 拼接", () => {
      expect(MEMBER_REFRESH_COOKIE).toBe(`${STORAGE_PREFIX}_member_refresh`);
    });

    it("access 与 refresh 名不同(避免读写混淆)", () => {
      expect(MEMBER_ACCESS_COOKIE).not.toBe(MEMBER_REFRESH_COOKIE);
    });
  });

  describe("max-age 与 SiteMemberAuthService TTL 一致", () => {
    it("access TTL = 900 秒(15 分钟)", () => {
      expect(MEMBER_ACCESS_COOKIE_MAX_AGE).toBe(900);
    });

    it("refresh TTL = 7 天(秒)", () => {
      expect(MEMBER_REFRESH_COOKIE_MAX_AGE).toBe(7 * 24 * 60 * 60);
    });

    it("refresh TTL 严格大于 access TTL(刷新机制前提)", () => {
      expect(MEMBER_REFRESH_COOKIE_MAX_AGE).toBeGreaterThan(
        MEMBER_ACCESS_COOKIE_MAX_AGE,
      );
    });
  });
});
