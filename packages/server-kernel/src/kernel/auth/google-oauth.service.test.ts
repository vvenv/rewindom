import { describe, it, expect, afterEach, vi } from "vitest";

import { AppError } from "../../lib/app-errors.js";

import {
  buildGoogleAuthorizeUrl,
  fetchGoogleProfile,
} from "./google-oauth.service.js";

import type { ResolvedOAuthCredentials } from "./oauth-credentials.js";

function makeCredentials(
  overrides: Partial<ResolvedOAuthCredentials> = {},
): ResolvedOAuthCredentials {
  return {
    provider: "google",
    clientId: "google-client-id",
    clientSecret: "google-secret",
    callbackUrl: "http://localhost/api/auth/oauth/google/callback",
    authority: "common",
    enabled: true,
    source: "platform",
    ...overrides,
  };
}

function mockFetchOnce(response: {
  ok: boolean;
  json: () => Promise<unknown>;
  status?: number;
}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(response as unknown as Response),
  );
}

describe("google-oauth.service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("buildGoogleAuthorizeUrl", () => {
    it("构造包含 client_id/redirect/state/scope 的授权 URL", () => {
      const url = buildGoogleAuthorizeUrl({
        state: "state-token",
        callbackUrl: "http://localhost/cb",
        credentials: makeCredentials(),
      });
      expect(
        url.startsWith("https://accounts.google.com/o/oauth2/v2/auth"),
      ).toBe(true);
      const parsed = new URL(url);
      expect(parsed.searchParams.get("client_id")).toBe("google-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "http://localhost/cb",
      );
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("scope")).toBe("openid email profile");
      expect(parsed.searchParams.get("state")).toBe("state-token");
      expect(parsed.searchParams.get("access_type")).toBe("online");
      expect(parsed.searchParams.get("prompt")).toBe("select_account");
    });

    it("credentials 未启用抛 AppError(oauth_not_configured)", () => {
      expect(() =>
        buildGoogleAuthorizeUrl({
          state: "s",
          callbackUrl: "http://x/cb",
          credentials: makeCredentials({ enabled: false }),
        }),
      ).toThrow(AppError);
    });

    it("provider 不是 google 抛 AppError", () => {
      expect(() =>
        buildGoogleAuthorizeUrl({
          state: "s",
          callbackUrl: "http://x/cb",
          credentials: makeCredentials({ provider: "github" }),
        }),
      ).toThrow(AppError);
    });
  });

  describe("fetchGoogleProfile", () => {
    it("正确转换 Google userinfo 为 OAuthProfile", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          sub: "g-123",
          email: "alice@example.com",
          email_verified: true,
          name: "Alice",
          picture: "https://img/avatar.png",
          given_name: "Alice",
        }),
      });
      const profile = await fetchGoogleProfile("token");
      expect(profile).toEqual({
        provider_user_id: "g-123",
        username: "alice", // email local-part
        email: "alice@example.com",
        email_verified: true,
        display_name: "Alice",
        avatar_url: "https://img/avatar.png",
      });
    });

    it("无 email 时 username 回退到 given_name,且 email_verified 为 false", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({
          sub: "g-456",
          name: "Bob",
          given_name: "Bob",
          email_verified: false,
        }),
      });
      const profile = await fetchGoogleProfile("token");
      expect(profile.username).toBe("bob");
      expect(profile.email).toBeNull();
      expect(profile.email_verified).toBe(false);
    });

    it("无任何来源时回退到 google_<sub>", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({ sub: "g-789" }),
      });
      const profile = await fetchGoogleProfile("token");
      expect(profile.username).toBe("google_g-789");
      expect(profile.email).toBeNull();
    });

    it("fetch !ok 抛 oauth_profile_failed", async () => {
      mockFetchOnce({ ok: false, json: async () => ({}) });
      await expect(fetchGoogleProfile("token")).rejects.toMatchObject({
        code: "auth.oauth_profile_failed",
      });
    });

    it("userinfo 缺 sub 抛 oauth_profile_failed", async () => {
      mockFetchOnce({
        ok: true,
        json: async () => ({ email: "x@y.com" }),
      });
      await expect(fetchGoogleProfile("token")).rejects.toMatchObject({
        code: "auth.oauth_profile_failed",
      });
    });

    it("请求带 Authorization: Bearer <token>", async () => {
      const mock = vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ sub: "x" }) });
      vi.stubGlobal("fetch", mock);
      await fetchGoogleProfile("my-token");
      expect(mock).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer my-token",
          }),
        }),
      );
    });
  });
});
