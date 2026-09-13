import { useContext } from "react";

import {
  api,
  ApiError,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  AuthProvider,
  AuthContext,
} from "@rewindom/client-kit";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

function useAuth() {
  return useContext(AuthContext)!;
}

vi.mock("@rewindom/client-kit/api.js", async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    api: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      download: vi.fn(),
    },
  };
});

const mockUser = {
  id: "u1",
  username: "admin",
  actor_type: "tenant_user" as const,
  is_system_admin: false,
  enabled: true,
  tenant_id: "t1",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
  last_access_at: null,
};

describe("AuthContext", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue(mockUser);
    Object.defineProperty(window, "location", {
      value: { ...originalLocation, href: "http://localhost/" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it("启动时应请求 /auth/me", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/auth/me");
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.username).toBe("admin");
    });
  });

  it("启动时清掉遗留 localStorage token", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "legacy");
    localStorage.setItem(REFRESH_TOKEN_KEY, "legacy");

    renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    });
  });

  it("authLogout 事件应清除会话并跳转登录", async () => {
    renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalled();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent("authLogout"));
    });

    await waitFor(() => {
      expect(window.location.href).toBe("/login");
    });
  });

  it("/auth/me 502 时不应当作未登录", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError("Bad Gateway", 502));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("login 成功后应设置用户信息", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ user: mockUser });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.login({ username: "admin", password: "pass" });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe("u1");
  });

  it("establishSession 应拉 /auth/me", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.establishSession();
    });

    expect(api.get).toHaveBeenCalledWith("/auth/me");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("logout 应调用接口并清除会话", async () => {
    vi.mocked(api.post).mockResolvedValue({});

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.logout();
    });

    expect(api.post).toHaveBeenCalledWith(
      "/auth/logout",
      {},
      undefined,
      true,
    );
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("logout 在 api 失败时仍应清除会话", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("changePassword 应调用 api.post", async () => {
    vi.mocked(api.post).mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await act(async () => {
      await result.current.changePassword({
        oldPassword: "old",
        newPassword: "new",
      });
    });

    expect(api.post).toHaveBeenCalledWith("/auth/change-password", {
      oldPassword: "old",
      newPassword: "new",
    });
  });

  it("init 时遇到 401 应标记未登录", async () => {
    vi.mocked(api.get).mockRejectedValue(new ApiError("Unauthorized", 401));

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
