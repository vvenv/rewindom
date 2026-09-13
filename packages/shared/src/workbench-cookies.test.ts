import { describe, it, expect } from "vitest";

import { STORAGE_PREFIX } from "./branding.js";
import {
  WORKBENCH_ACCESS_COOKIE,
  WORKBENCH_ACCESS_COOKIE_MAX_AGE,
  WORKBENCH_IMPERSONATION_RETURN_COOKIE,
  WORKBENCH_REFRESH_COOKIE,
  WORKBENCH_REFRESH_COOKIE_MAX_AGE,
} from "./workbench-cookies.js";
import {
  MEMBER_ACCESS_COOKIE,
  MEMBER_REFRESH_COOKIE,
} from "./member-cookies.js";

describe("workbench-cookies", () => {
  it("access / refresh / return 名互不相同且带前缀", () => {
    expect(WORKBENCH_ACCESS_COOKIE).toBe(`${STORAGE_PREFIX}_access`);
    expect(WORKBENCH_REFRESH_COOKIE).toBe(`${STORAGE_PREFIX}_refresh`);
    expect(WORKBENCH_IMPERSONATION_RETURN_COOKIE).toBe(
      `${STORAGE_PREFIX}_impersonation_return`,
    );
    expect(WORKBENCH_ACCESS_COOKIE).not.toBe(WORKBENCH_REFRESH_COOKIE);
  });

  it("与会员 cookie 名隔离", () => {
    expect(WORKBENCH_ACCESS_COOKIE).not.toBe(MEMBER_ACCESS_COOKIE);
    expect(WORKBENCH_REFRESH_COOKIE).not.toBe(MEMBER_REFRESH_COOKIE);
  });

  it("TTL 与 jwt 常量一致", () => {
    expect(WORKBENCH_ACCESS_COOKIE_MAX_AGE).toBe(900);
    expect(WORKBENCH_REFRESH_COOKIE_MAX_AGE).toBe(7 * 24 * 60 * 60);
    expect(WORKBENCH_REFRESH_COOKIE_MAX_AGE).toBeGreaterThan(
      WORKBENCH_ACCESS_COOKIE_MAX_AGE,
    );
  });
});
