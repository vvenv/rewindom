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

beforeEach(() => {
  findUnique.mockReset();
  decryptMock.mockReset();
  vi.resetModules();
});

describe("resolveSiteOAuthCredentials", () => {
  it("falls back to platform env when the site has no override", async () => {
    findUnique.mockResolvedValue(null);
    const { resolveSiteOAuthCredentials } = await import(
      "./oauth-credentials.js"
    );
    const resolved = await resolveSiteOAuthCredentials("github", "tenant-1");
    expect(resolved.source).toBe("platform");
    expect(resolved.enabled).toBe(true);
    expect(resolved.clientId).toBe("platform-gh-id");
  });

  it("uses the site override when both client_id and client_secret are set", async () => {
    findUnique.mockResolvedValue({ secret: "cipher" });
    decryptMock.mockReturnValue(
      JSON.stringify({
        github: {
          client_id: "site-gh-id",
          client_secret: "site-gh-secret",
          callback_url: "https://acme.example/callback",
        },
      }),
    );
    const { resolveSiteOAuthCredentials } = await import(
      "./oauth-credentials.js"
    );
    const resolved = await resolveSiteOAuthCredentials("github", "tenant-1");
    expect(resolved.source).toBe("tenant");
    expect(resolved.clientId).toBe("site-gh-id");
    expect(resolved.callbackUrl).toBe("https://acme.example/callback");
  });

  it("ignores an incomplete site override", async () => {
    findUnique.mockResolvedValue({ secret: "cipher" });
    decryptMock.mockReturnValue(
      JSON.stringify({
        github: { client_id: "only-id" },
      }),
    );
    const { resolveSiteOAuthCredentials } = await import(
      "./oauth-credentials.js"
    );
    const resolved = await resolveSiteOAuthCredentials("github", "tenant-1");
    expect(resolved.source).toBe("platform");
    expect(resolved.clientId).toBe("platform-gh-id");
  });

  it("reads the site-scoped setting key", async () => {
    findUnique.mockResolvedValue(null);
    const { resolveSiteOAuthCredentials, SITE_OAUTH_PROVIDERS_SETTING_KEY } =
      await import("./oauth-credentials.js");
    await resolveSiteOAuthCredentials("github", "tenant-1");
    expect(SITE_OAUTH_PROVIDERS_SETTING_KEY).toBe("site_oauth_providers");
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id_key: {
            tenant_id: "tenant-1",
            key: "site_oauth_providers",
          },
        },
      }),
    );
  });
});

describe("resolvePlatformOAuthCredentials", () => {
  /*
   * 中台登录不认站点覆盖——这是「品牌与第三方登录不影响中台」那次调整的核心约束。
   * 用「一次库都没查」来钉死它：只要有人把 tenantId 塞回中台那条路，这条就会红。
   */
  it("never touches the database", async () => {
    const { resolvePlatformOAuthCredentials } = await import(
      "./oauth-credentials.js"
    );
    const resolved = resolvePlatformOAuthCredentials("github");
    expect(resolved.source).toBe("platform");
    expect(resolved.clientId).toBe("platform-gh-id");
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("reports platform-only enabled flags", async () => {
    const { platformOAuthEnabledFlags } = await import("./oauth-credentials.js");
    expect(platformOAuthEnabledFlags()).toEqual({
      github_oauth_enabled: true,
      google_oauth_enabled: false,
      microsoft_oauth_enabled: true,
    });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
