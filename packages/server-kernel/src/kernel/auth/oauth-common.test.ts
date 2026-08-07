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

import { resolveMemberOAuthCallbackUrl } from "./oauth-common.js";

describe("resolveMemberOAuthCallbackUrl", () => {
  it("derives member callback from FRONTEND_URL when credentials carry auth CALLBACK_URL", () => {
    expect(
      resolveMemberOAuthCallbackUrl("google", {
        callbackUrl:
          "http://localhost:7300/api/auth/oauth/google/callback",
      }),
    ).toBe("http://localhost:7300/api/member/oauth/google/callback");
  });

  it("keeps an explicit member callback URL", () => {
    expect(
      resolveMemberOAuthCallbackUrl("google", {
        callbackUrl:
          "https://app.example.com/api/member/oauth/google/callback",
      }),
    ).toBe("https://app.example.com/api/member/oauth/google/callback");
  });

  it("derives member callback when callbackUrl is empty", () => {
    expect(
      resolveMemberOAuthCallbackUrl("github", { callbackUrl: "" }),
    ).toBe("http://localhost:7300/api/member/oauth/github/callback");
  });
});
