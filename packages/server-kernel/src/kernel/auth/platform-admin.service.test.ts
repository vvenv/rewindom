import { PLATFORM_ADMIN_USER_ID } from "@be-water/shared";
import bcrypt from "bcrypt";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/config.js", () => ({
  config: {
    auth: {
      platformAdmin: {
        username: "platform",
        password: "secret",
        passwordHash: "",
      },
    },
    database: { url: "postgresql://test" },
  },
}));

vi.mock("../../lib/prisma.js", () => ({
  prisma: {},
}));

import {
  buildPlatformAdminUser,
  generatePlatformAdminTokens,
  isPlatformAdminConfigured,
  isPlatformAdminUsername,
  verifyPlatformAdminPassword,
} from "./platform-admin.service.js";

describe("platform-admin.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects configured platform admin", () => {
    expect(isPlatformAdminConfigured()).toBe(true);
  });

  it("matches any non-empty username without @ suffix", () => {
    expect(isPlatformAdminUsername("platform")).toBe(true);
    expect(isPlatformAdminUsername("other")).toBe(true);
    expect(isPlatformAdminUsername("platform@acme")).toBe(false);
    expect(isPlatformAdminUsername("")).toBe(false);
  });

  it("verifies password against hash", async () => {
    const hash = await bcrypt.hash("secret", 4);
    await expect(verifyPlatformAdminPassword("secret", hash)).resolves.toBe(
      true,
    );
    await expect(verifyPlatformAdminPassword("wrong", hash)).resolves.toBe(
      false,
    );
  });

  it("builds platform admin user", () => {
    const now = new Date();
    const user = buildPlatformAdminUser({
      id: PLATFORM_ADMIN_USER_ID,
      username: "platform",
      is_system_admin: true,
      enabled: true,
      created_at: now,
      updated_at: now,
      last_login_at: null,
      last_access_at: null,
    });
    expect(user.id).toBe(PLATFORM_ADMIN_USER_ID);
    expect(user.actor_type).toBe("platform_admin");
    expect(user.is_system_admin).toBe(true);
    expect(user.username).toBe("platform");
  });

  it("generates platform admin tokens", () => {
    const jwtSign = vi.fn((payload) => JSON.stringify(payload));
    const tokens = generatePlatformAdminTokens(
      PLATFORM_ADMIN_USER_ID,
      true,
      jwtSign,
    );
    expect(tokens.accessToken).toContain(PLATFORM_ADMIN_USER_ID);
    expect(tokens.refreshToken).toContain("refresh");
    expect(jwtSign).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: "platform_admin",
        is_system_admin: true,
        type: "access",
      }),
    );
  });
});
