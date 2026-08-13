import { beforeEach, describe, expect, it, vi } from "vitest";

const findUniqueOAuth = vi.fn();
const findUniqueMember = vi.fn();
const createMember = vi.fn();
const createOAuth = vi.fn();
const updateMember = vi.fn();
const createExchange = vi.fn();
const findUniqueExchange = vi.fn();
const updateExchange = vi.fn();
const createRefresh = vi.fn();

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    siteMemberOAuthAccount: {
      findUnique: (...args: unknown[]) => findUniqueOAuth(...args),
      create: (...args: unknown[]) => createOAuth(...args),
    },
    siteMember: {
      findUnique: (...args: unknown[]) => findUniqueMember(...args),
      findFirst: vi.fn(),
      create: (...args: unknown[]) => createMember(...args),
      update: (...args: unknown[]) => updateMember(...args),
    },
    siteMemberOAuthExchangeCode: {
      create: (...args: unknown[]) => createExchange(...args),
      findUnique: (...args: unknown[]) => findUniqueExchange(...args),
      update: (...args: unknown[]) => updateExchange(...args),
    },
    siteMemberRefreshToken: {
      create: (...args: unknown[]) => createRefresh(...args),
    },
  },
}));

vi.mock("@rewindom/server-kernel/kernel/auth/github-oauth.service.js", () => ({
  buildGithubAuthorizeUrl: vi.fn(),
  GithubOAuthService: {
    fetchProfileFromCode: vi.fn(async () => ({
      provider_user_id: "gh-1",
      username: "alice",
      email: "alice@example.com",
      email_verified: true,
      display_name: "Alice",
      avatar_url: null,
    })),
  },
}));

vi.mock("@rewindom/server-kernel/kernel/auth/google-oauth.service.js", () => ({
  buildGoogleAuthorizeUrl: vi.fn(),
  GoogleOAuthService: { fetchProfileFromCode: vi.fn() },
}));

vi.mock("@rewindom/server-kernel/kernel/auth/microsoft-oauth.service.js", () => ({
  buildMicrosoftAuthorizeUrl: vi.fn(),
  MicrosoftOAuthService: { fetchProfileFromCode: vi.fn() },
}));

import { SiteMemberOAuthService } from "./site-member-oauth.service.js";

const credentials = {
  provider: "github" as const,
  clientId: "id",
  clientSecret: "secret",
  callbackUrl: "",
  authority: "common",
  enabled: true,
  source: "platform" as const,
};

const tenant = { id: "t1", slug: "acme" };

describe("SiteMemberOAuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs in existing OAuth binding", async () => {
    findUniqueOAuth.mockResolvedValue({
      member_id: "m1",
      member: {
        id: "m1",
        tenant_id: "t1",
        email: "alice@example.com",
        display_name: "Alice",
        email_verified_at: new Date(),
        enabled: true,
        created_at: new Date(),
        last_login_at: null,
      },
    });
    updateMember.mockResolvedValue({
      id: "m1",
      tenant_id: "t1",
      email: "alice@example.com",
      display_name: "Alice",
      email_verified_at: new Date(),
      enabled: true,
      created_at: new Date(),
      last_login_at: new Date(),
    });

    const result = await SiteMemberOAuthService.completeOAuthLogin({
      provider: "github",
      code: "code",
      callbackUrl: "https://example.com/callback",
      credentials,
      tenant,
    });

    expect(result.is_new_member).toBe(false);
    expect(result.member.email).toBe("alice@example.com");
    expect(createMember).not.toHaveBeenCalled();
  });

  it("creates member when email is verified and unbound", async () => {
    findUniqueOAuth.mockResolvedValue(null);
    findUniqueMember.mockResolvedValue(null);
    createMember.mockResolvedValue({
      id: "m2",
      tenant_id: "t1",
      email: "alice@example.com",
      display_name: "Alice",
      email_verified_at: new Date(),
      enabled: true,
      created_at: new Date(),
      last_login_at: new Date(),
    });
    createOAuth.mockResolvedValue({});

    const result = await SiteMemberOAuthService.completeOAuthLogin({
      provider: "github",
      code: "code",
      callbackUrl: "https://example.com/callback",
      credentials,
      tenant,
    });

    expect(result.is_new_member).toBe(true);
    expect(createOAuth).toHaveBeenCalled();
  });

  it("rejects expired exchange codes", async () => {
    findUniqueExchange.mockResolvedValue({
      id: "x1",
      tenant_id: "t1",
      member_id: "m1",
      consumed_at: null,
      expires_at: new Date(Date.now() - 1000),
      member: {
        id: "m1",
        tenant_id: "t1",
        email: "alice@example.com",
        display_name: "Alice",
        email_verified_at: new Date(),
        enabled: true,
        created_at: new Date(),
        last_login_at: null,
      },
    });

    await expect(
      SiteMemberOAuthService.exchangeCode({
        code: "dead",
        tenant,
        jwtSign: () => "token",
      }),
    ).rejects.toMatchObject({ code: "site_member.oauth_exchange_invalid" });
  });

  it("rejects exchange when host tenant mismatches", async () => {
    findUniqueExchange.mockResolvedValue({
      id: "x1",
      tenant_id: "other",
      member_id: "m1",
      consumed_at: null,
      expires_at: new Date(Date.now() + 60_000),
      member: {
        id: "m1",
        tenant_id: "other",
        email: "alice@example.com",
        display_name: "Alice",
        email_verified_at: new Date(),
        enabled: true,
        created_at: new Date(),
        last_login_at: null,
      },
    });

    await expect(
      SiteMemberOAuthService.exchangeCode({
        code: "ok",
        tenant,
        jwtSign: () => "token",
      }),
    ).rejects.toMatchObject({ code: "site_member.oauth_exchange_invalid" });
  });
});
