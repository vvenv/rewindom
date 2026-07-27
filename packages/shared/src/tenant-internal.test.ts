import { describe, expect, it } from "vitest";

import {
  TENANT_IMPERSONATION_USERNAME,
  isReservedTenantUsername,
} from "./tenant-internal.js";

describe("tenant-internal", () => {
  it("defines impersonation username constant", () => {
    expect(TENANT_IMPERSONATION_USERNAME).toBe("__support_impersonation__");
  });

  describe("isReservedTenantUsername", () => {
    it("returns true for impersonation username", () => {
      expect(isReservedTenantUsername("__support_impersonation__")).toBe(true);
    });

    it("returns true for platform system username", () => {
      expect(isReservedTenantUsername("__platform_system__")).toBe(true);
    });

    it("returns false for normal usernames", () => {
      expect(isReservedTenantUsername("admin")).toBe(false);
      expect(isReservedTenantUsername("user123")).toBe(false);
      expect(isReservedTenantUsername("john_doe")).toBe(false);
      expect(isReservedTenantUsername("")).toBe(false);
    });
  });
});
