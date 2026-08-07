import { describe, it, expect, afterEach, vi } from "vitest";

import { AppError } from "../../lib/app-errors.js";

import {
  buildMicrosoftAuthorizeUrl,
  fetchMicrosoftProfile,
} from "./microsoft-oauth.service.js";

import type { ResolvedOAuthCredentials } from "./oauth-credentials.js";

function makeCredentials(
  overrides: Partial<ResolvedOAuthCredentials> = {},
): ResolvedOAuthCredentials {
  return {
    provider: "microsoft",
    clientId: "ms-client-id",
    clientSecret: "ms-secret",
    callbackUrl: "http://localhost/api/auth/oauth/microsoft/callback",
    authority: "common",
    enabled: true,
    source: "platform",
    ...overrides,
  };
}

function mockFetchOnce(response: {
  ok: boolean;
  json: () => Promise<unknown>;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(response as unknown as Response),
  );
}

describe("microsoft-oauth.service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("buildMicrosoftAuthorizeUrl", () => {
    it("构造包含 client_id/redirect/scope 的授权 URL", () => {
      const url = buildMicrosoftAuthorizeUrl({
        state: "state-token",
        callbackUrl: "http://localhost/cb",
        credentials: makeCredentials(),
      });
      // authority=common → https://login.microsoftonline.com/common/oauth2/v2.0/authorize
      expect(
        url.startsWith(
          "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        ),
      ).toBe(true);
      const parsed = new URL(url);
      expect(parsed.searchParams.get("client_id")).toBe("ms-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "http://localhost/cb",
      );
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("response_mode")).toBe("query");
      expect(parsed.searchParams.get("state")).toBe("state-token");
      expect(parsed.searchParams.get("scope")).toBe(
        "openid profile email User.Read offline_access",
      );
    });

    it("authority 自定义会拼进 URL", () => {
      const url = buildMicrosoftAuthorizeUrl({
        state: "s",
        callbackUrl: "http://x/cb",
        credentials: makeCredentials({ authority: "contoso.onmicrosoft.com" }),
      });
      expect(
        url.startsWith(
          "https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize",
        ),
      ).toBe(true);
    });

    it("credentials 未启用抛 AppError", () => {
      expect(() =>
        buildMicrosoftAuthorizeUrl({
          state: "s",
          callbackUrl: "http://x/cb",
          credentials: makeCredentials({ enabled: false }),
        }),
      ).toThrow(AppError);
    });

    it("provider 不是 microsoft 抛 AppError", () => {
      expect(() =>
        buildMicrosoftAuthorizeUrl({
          state: "s",
          callbackUrl: "http://x/cb",
          credentials: makeCredentials({ provider: "google" }),
        }),
      ).toThrow(AppError);
    });
  });

  describe("fetchMicrosoftProfile", () => {
    it("mail 邮箱转换为 OAuthProfile 且 email_verified=true", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          id: "ms-123",
          displayName: "Alice",
          mail: "alice@contoso.com",
          givenName: "Alice",
        }),
      });
      const profile = await fetchMicrosoftProfile("token");
      expect(profile).toEqual({
        provider_user_id: "ms-123",
        username: "alice",
        email: "alice@contoso.com",
        email_verified: true, // Graph 工作邮箱视为已验证
        display_name: "Alice",
        avatar_url: null,
      });
    });

    it("无 mail 时回退到 userPrincipalName", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          id: "ms-456",
          displayName: "Bob",
          userPrincipalName: "bob@contoso.com",
        }),
      });
      const profile = await fetchMicrosoftProfile("token");
      expect(profile.email).toBe("bob@contoso.com");
      expect(profile.email_verified).toBe(true);
      expect(profile.username).toBe("bob");
    });

    it("mail 不含 @ 时 email 为 null,email_verified 为 false", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          id: "ms-789",
          displayName: "Carol",
          mail: "not-an-email",
          givenName: "Carol",
        }),
      });
      const profile = await fetchMicrosoftProfile("token");
      expect(profile.email).toBeNull();
      expect(profile.email_verified).toBe(false);
      // username 回退到 givenName
      expect(profile.username).toBe("carol");
    });

    it("无任何用户名来源时回退到 ms_<id>", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({ id: "ms-000" }),
      });
      const profile = await fetchMicrosoftProfile("token");
      expect(profile.username).toBe("ms_ms-000");
      expect(profile.email).toBeNull();
      expect(profile.email_verified).toBe(false);
      expect(profile.display_name).toBeNull();
      expect(profile.avatar_url).toBeNull();
    });

    it("fetch !ok 抛 oauth_profile_failed", async () => {
      mockFetchOnce({ ok: false, json: async () => ({}) });
      await expect(fetchMicrosoftProfile("token")).rejects.toMatchObject({
        code: "auth.oauth_profile_failed",
      });
    });

    it("Graph 返回缺 id 抛 oauth_profile_failed", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({ displayName: "X" }),
      });
      await expect(fetchMicrosoftProfile("token")).rejects.toMatchObject({
        code: "auth.oauth_profile_failed",
      });
    });

    it("请求带 Authorization: Bearer <token>", async () => {
      const mock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ id: "x" }) });
      vi.stubGlobal("fetch", mock);
      await fetchMicrosoftProfile("my-token");
      expect(mock).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-token",
          }),
        }),
      );
    });
  });
});
