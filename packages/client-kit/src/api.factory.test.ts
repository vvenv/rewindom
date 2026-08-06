import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiClient, type ApiClientOptions } from "./api.js";

import type { AuthTokenStore } from "./auth-store.js";

function memoryTokenStore(
  initial?: { access?: string | null; refresh?: string | null },
): AuthTokenStore & { access: string | null; refresh: string | null } {
  const store = {
    access: initial?.access ?? null,
    refresh: initial?.refresh ?? null,
    getAccessToken: () => store.access,
    getRefreshToken: () => store.refresh,
    setTokens: (tokens: { accessToken: string; refreshToken: string }) => {
      store.access = tokens.accessToken;
      store.refresh = tokens.refreshToken;
    },
    clearTokens: () => {
      store.access = null;
      store.refresh = null;
    },
  };
  return store;
}

function clientOptions(
  store: AuthTokenStore,
  overrides?: Partial<ApiClientOptions>,
): ApiClientOptions {
  return {
    tokenStore: store,
    refreshPath: "/auth/refresh",
    refreshBodyKey: "refreshToken",
    tokenRefreshedEvent: "tokenRefreshedWorkbench",
    authLogoutEvent: "authLogoutWorkbench",
    ...overrides,
  };
}

describe("createApiClient isolation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps refresh state and tokens isolated across two clients", async () => {
    const workbenchStore = memoryTokenStore({
      access: "wb-access",
      refresh: "wb-refresh",
    });
    const memberStore = memoryTokenStore({
      access: "m-access",
      refresh: "m-refresh",
    });

    const workbench = createApiClient(clientOptions(workbenchStore));
    const member = createApiClient(
      clientOptions(memberStore, {
        refreshPath: "/member/refresh",
        refreshBodyKey: "refresh_token",
        tokenRefreshedEvent: "tokenRefreshedMember",
        authLogoutEvent: "authLogoutMember",
      }),
    );

    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/auth/refresh")) {
          refreshCalls += 1;
          return new Response(
            JSON.stringify({
              data: {
                accessToken: "wb-access-2",
                refreshToken: "wb-refresh-2",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/member/refresh")) {
          refreshCalls += 1;
          return new Response(
            JSON.stringify({
              data: {
                accessToken: "m-access-2",
                refreshToken: "m-refresh-2",
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/notes") || url.includes("/member/me")) {
          const auth = (init?.headers as Record<string, string> | undefined)
            ?.Authorization;
          if (auth?.includes("access-2")) {
            return new Response(JSON.stringify({ data: { ok: true } }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    // 两个实例各自 401 → 各自 refresh，互不覆盖对方 token
    const [wbResult, memberResult] = await Promise.all([
      workbench.get<{ ok: boolean }>("/notes"),
      member.get<{ ok: boolean }>("/member/me"),
    ]);

    expect(wbResult).toEqual({ ok: true });
    expect(memberResult).toEqual({ ok: true });
    expect(refreshCalls).toBe(2);
    expect(workbenchStore.access).toBe("wb-access-2");
    expect(workbenchStore.refresh).toBe("wb-refresh-2");
    expect(memberStore.access).toBe("m-access-2");
    expect(memberStore.refresh).toBe("m-refresh-2");
  });

  it("pauseTokenRefresh only affects that client instance", async () => {
    const workbenchStore = memoryTokenStore({
      access: "wb-access",
      refresh: "wb-refresh",
    });
    const memberStore = memoryTokenStore({
      access: "m-access",
      refresh: "m-refresh",
    });
    const workbench = createApiClient(clientOptions(workbenchStore));
    const member = createApiClient(
      clientOptions(memberStore, {
        refreshPath: "/member/refresh",
        refreshBodyKey: "refresh_token",
        tokenRefreshedEvent: "tokenRefreshedMember",
        authLogoutEvent: "authLogoutMember",
      }),
    );

    const resume = workbench.pauseTokenRefresh();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/member/refresh")) {
          return new Response(
            JSON.stringify({
              data: { accessToken: "m-access-2", refreshToken: "m-refresh-2" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("/member/me")) {
          const auth = (init?.headers as Record<string, string> | undefined)
            ?.Authorization;
          if (auth?.includes("m-access-2")) {
            return new Response(JSON.stringify({ data: { ok: true } }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
          });
        }
        if (url.includes("/notes")) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
          });
        }
        return new Response("not found", { status: 404 });
      }),
    );

    await expect(workbench.get("/notes")).rejects.toThrow();
    expect(workbenchStore.access).toBe("wb-access");

    await expect(member.get("/member/me")).resolves.toEqual({ ok: true });
    expect(memberStore.access).toBe("m-access-2");

    resume();
  });
});
