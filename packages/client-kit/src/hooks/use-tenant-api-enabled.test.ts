import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTenantApiEnabled } from "./use-tenant-api-enabled.js";

const mockAuth = vi.hoisted(() => ({
  current: null as null | {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: { actor_type: string } | null;
  },
}));

vi.mock("./useOptionalAuth.js", () => ({
  useOptionalAuth: () => mockAuth.current,
}));

describe("useTenantApiEnabled", () => {
  beforeEach(() => {
    mockAuth.current = null;
  });

  it("显式 enabled=false 时关闭", () => {
    mockAuth.current = {
      isLoading: false,
      isAuthenticated: true,
      user: { actor_type: "tenant_user" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(false));
    expect(result.current).toBe(false);
  });

  it("认证解析中关闭", () => {
    mockAuth.current = {
      isLoading: true,
      isAuthenticated: false,
      user: null,
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(false);
  });

  it("平台管理员关闭", () => {
    mockAuth.current = {
      isLoading: false,
      isAuthenticated: true,
      user: { actor_type: "platform_admin" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(false);
  });

  it("未认证关闭", () => {
    mockAuth.current = {
      isLoading: false,
      isAuthenticated: false,
      user: null,
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(false);
  });

  it("租户用户开启", () => {
    mockAuth.current = {
      isLoading: false,
      isAuthenticated: true,
      user: { actor_type: "tenant_user" },
    };
    const { result } = renderHook(() => useTenantApiEnabled(true));
    expect(result.current).toBe(true);
  });
});
