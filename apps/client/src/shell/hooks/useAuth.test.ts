import { AuthProvider, useAuth  } from "@rewindom/client-kit";
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";


describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    // MSW 已在网络层接管 fetch，无需手动 mock globalThis.fetch。
    // 无 token 时 AuthProvider 不会发请求，初始状态即 isLoading=false / user=null。
  });

  it("应该在 AuthProvider 外部使用时抛出错误", () => {
    expect(() => {
      useAuth();
    }).toThrow();
  });

  it("应该在 AuthProvider 内部成功返回 context", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current).toBeDefined();
    expect(typeof result.current.login).toBe("function");
    expect(typeof result.current.logout).toBe("function");
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
