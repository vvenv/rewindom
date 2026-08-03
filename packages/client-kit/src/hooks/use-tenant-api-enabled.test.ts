import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTenantApiEnabled } from "./use-tenant-api-enabled.js";

function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function fakeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "none" })}.${b64url(payload)}.sig`;
}

const mockAuth = vi.hoisted(() => ({
  current: null as null | {
    isLoading: boolean;
    accessToken: string | null;
    user: { actor_type: string } | null;
  },
}));

vi.mock("./useOptionalAuth.js", () => ({
  useOptionalAuth: () => mockAuth.current,
}));

vi.mock("../lib/auth-token-storage.js", () => ({
  getStoredAccessToken: () => mockAuth.current?.accessToken ?? null,
}));

describe("useTenantApiEnabled", () => {
  beforeEach(() => {
    mockAuth.current = null;
  });

  it("显式 enabled=false 时关闭", () => {
    mockAuth.current = {
      isLoading: false,
      accessToken: fakeJwt({ actor_type: "tenant_user", type: "access" }),
      user: { actor_type: "tenant_user" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(false));
    expect(result.current).toBe(false);
  });

  it("认证解析中关闭", () => {
    mockAuth.current = {
      isLoading: true,
      accessToken: fakeJwt({ actor_type: "tenant_user", type: "access" }),
      user: null,
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(false);
  });

  it("平台管理员 JWT 关闭", () => {
    mockAuth.current = {
      isLoading: false,
      accessToken: fakeJwt({ actor_type: "platform_admin", type: "access" }),
      user: { actor_type: "platform_admin" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(false);
  });

  it("React user 仍是租户、JWT 已是平台管理员时关闭（防刷 403）", () => {
    mockAuth.current = {
      isLoading: false,
      accessToken: fakeJwt({ actor_type: "platform_admin", type: "access" }),
      user: { actor_type: "tenant_user" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(false);
  });

  it("租户用户 JWT 开启", () => {
    mockAuth.current = {
      isLoading: false,
      accessToken: fakeJwt({
        actor_type: "tenant_user",
        tenant_id: "t1",
        type: "access",
      }),
      user: { actor_type: "tenant_user" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(true);
  });
});
