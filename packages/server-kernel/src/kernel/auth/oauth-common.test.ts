import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: {},
}));

vi.mock("../../lib/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/config.js")>();
  return {
    config: {
      ...actual.config,
      frontend: { ...actual.config.frontend, url: "http://localhost:7300" },
    },
  };
});

import {
  isMemberOAuthStateTyp,
  memberOAuthStateType,
  oauthStateType,
  resolveMemberOAuthCallbackUrl,
  resolveOAuthCallbackUrl,
} from "./oauth-common.js";

describe("OAuth callback URL unification", () => {
  it("resolveOAuthCallbackUrl uses auth path by default", () => {
    expect(
      resolveOAuthCallbackUrl("google", "http://localhost:7300", {
        callbackUrl: "",
      }),
    ).toBe("http://localhost:7300/api/auth/oauth/google/callback");
  });

  it("resolveOAuthCallbackUrl prefers explicit credentials callbackUrl", () => {
    expect(
      resolveOAuthCallbackUrl("google", "http://localhost:7300", {
        callbackUrl: "https://app.example.com/api/auth/oauth/google/callback",
      }),
    ).toBe("https://app.example.com/api/auth/oauth/google/callback");
  });

  it("resolveMemberOAuthCallbackUrl shares the auth callback URL", () => {
    expect(
      resolveMemberOAuthCallbackUrl("google", {
        callbackUrl:
          "http://localhost:7300/api/auth/oauth/google/callback",
      }),
    ).toBe("http://localhost:7300/api/auth/oauth/google/callback");
  });

  it("resolveMemberOAuthCallbackUrl derives unified path when empty", () => {
    expect(
      resolveMemberOAuthCallbackUrl("github", { callbackUrl: "" }),
    ).toBe("http://localhost:7300/api/auth/oauth/github/callback");
  });

  it("member and workspace state typ helpers stay distinct", () => {
    expect(oauthStateType("google")).toBe("oauth_google_state");
    expect(memberOAuthStateType("google")).toBe("member_oauth_google_state");
    expect(isMemberOAuthStateTyp("member_oauth_google_state", "google")).toBe(
      true,
    );
    expect(isMemberOAuthStateTyp("oauth_google_state", "google")).toBe(false);
  });
});
