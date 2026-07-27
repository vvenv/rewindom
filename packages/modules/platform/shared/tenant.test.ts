import { describe, expect, it } from "vitest";

import { TENANT_INITIAL_ADMIN_USERNAME } from "./tenant.js";

describe("tenant constants", () => {
  it("应该有正确的初始管理员用户名", () => {
    expect(TENANT_INITIAL_ADMIN_USERNAME).toBe("admin");
  });
});
