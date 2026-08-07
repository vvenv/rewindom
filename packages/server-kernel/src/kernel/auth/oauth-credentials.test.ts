import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const decryptMock = vi.fn();

vi.mock("../../lib/prisma.js", () => ({
  prisma: {
    tenantSetting: {
      findUnique,
    },
  },
}));

vi.mock("../../lib/tenant-secret-crypto.js", () => ({
  decryptTenantSecret: (cipher: string) => decryptMock(cipher),
}));

vi.mock("../../lib/config.js", () => ({
  config: {
    auth: {
      github: {
        clientId: "platform-gh-id",
        clientSecret: "platform-gh-secret",
        callbackUrl: "",
        enabled: true,
      },
      google: {
        clientId: "",
        clientSecret: "",
        callbackUrl: "",
        enabled: false,
      },
      microsoft: {
        clientId: "platform-ms-id",
        clientSecret: "platform-ms-secret",
        callbackUrl: "",
        enabled: true,
        authority: "common",
      },
    },
  },
}));

describe("resolveOAuthCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
    decryptMock.mockReset();
    vi.resetModules();
  });

  it("falls back to platform env when no tenant override", async () => {
    findUnique.mockResolvedValue(null);
    const { resolveOAuthCredentials } = await import("./oauth-credentials.js");
    const resolved = await resolveOAuthCredentials("github", "tenant-1");
    expect(resolved.source).toBe("platform");
    expect(resolved.enabled).toBe(true);
    expect(resolved.clientId).toBe("platform-gh-id");
  });

  it("uses tenant override when both client_id and client_secret are set", async () => {
    findUnique.mockResolvedValue({ secret: "cipher" });
    decryptMock.mockReturnValue(
      JSON.stringify({
        github: {
          client_id: "tenant-gh-id",
          client_secret: "tenant-gh-secret",
          callback_url: "https://acme.example/callback",
        },
      }),
    );
    const { resolveOAuthCredentials } = await import("./oauth-credentials.js");
    const resolved = await resolveOAuthCredentials("github", "tenant-1");
    expect(resolved.source).toBe("tenant");
    expect(resolved.clientId).toBe("tenant-gh-id");
    expect(resolved.callbackUrl).toBe("https://acme.example/callback");
  });

  it("ignores incomplete tenant override", async () => {
    findUnique.mockResolvedValue({ secret: "cipher" });
    decryptMock.mockReturnValue(
      JSON.stringify({
        github: { client_id: "only-id" },
      }),
    );
    const { resolveOAuthCredentials } = await import("./oauth-credentials.js");
    const resolved = await resolveOAuthCredentials("github", "tenant-1");
    expect(resolved.source).toBe("platform");
    expect(resolved.clientId).toBe("platform-gh-id");
  });
});
