import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";


import { AuthContext, type AuthContextType } from "./contexts/AuthContext.js";
import {
  PermissionsProvider,
  usePermissions,
  type PermissionsValue,
} from "./permission-context.js";

import type { User } from "@be-water/shared";

const testUser: User = {
  id: "u1",
  username: "alice",
  actor_type: "tenant_user",
  is_system_admin: false,
  enabled: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
  last_access_at: null,
};

function createAuthWrapper(user: AuthContextType["user"] | null) {
  const value: AuthContextType = {
    user,
    accessToken: user ? "token" : null,
    refreshToken: user ? "refresh" : null,
    isAuthenticated: user != null,
    isLoading: false,
    login: vi.fn(),
    loginWithTokens: vi.fn(),
    logout: vi.fn(),
    refreshAccessToken: vi.fn(),
    changePassword: vi.fn(),
    getCurrentUser: vi.fn(),
  };

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
  };
}

describe("usePermissions", () => {
  it("allows any permission for authenticated users without RBAC provider", () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createAuthWrapper(testUser),
    });

    expect(result.current.hasPermission("notes.write")).toBe(true);
    expect(result.current.hasAnyPermission(["notes.read"])).toBe(true);
    expect(result.current.permissions).toEqual([]);
  });

  it("denies permissions when unauthenticated without RBAC provider", () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: createAuthWrapper(null),
    });

    expect(result.current.hasPermission("notes.read")).toBe(false);
  });

  it("uses injected RBAC provider when present", () => {
    const injected: PermissionsValue = {
      permissions: ["notes.read"],
      hasPermission: (permission) => permission === "notes.read",
      hasAnyPermission: (perms) => perms.includes("notes.read"),
      hasAllPermissions: (perms) =>
        perms.length === 1 && perms[0] === "notes.read",
      isLoading: false,
      isError: false,
    };

    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => {
        const AuthWrapper = createAuthWrapper(testUser);
        return (
          <AuthWrapper>
            <PermissionsProvider value={injected}>{children}</PermissionsProvider>
          </AuthWrapper>
        );
      },
    });

    expect(result.current.hasPermission("notes.read")).toBe(true);
    expect(result.current.hasPermission("notes.write")).toBe(false);
  });
});
