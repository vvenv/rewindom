import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthContext, type AuthContextType } from "../contexts/AuthContext.js";

import {
  APP_HOME_ENTRY_PATH,
  PLATFORM_HOME_PATH,
  useDefaultHomePath,
} from "./useDefaultHomePath.js";

import type { ReactNode } from "react";
import type { AuthActorType, User } from "@be-water/shared";

function wrapperWithUser(user: User | null) {
  const value = {
    user,
    accessToken: user ? "token" : null,
    refreshToken: user ? "refresh" : null,
    isAuthenticated: Boolean(user),
    isLoading: false,
  } as AuthContextType;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
  };
}

function userWithActor(actorType: AuthActorType): User {
  return { id: "u1", username: "u", actor_type: actorType } as User;
}

describe("useDefaultHomePath", () => {
  it("平台管理员回平台控制台", () => {
    const { result } = renderHook(() => useDefaultHomePath(), {
      wrapper: wrapperWithUser(userWithActor("platform_admin")),
    });

    expect(result.current).toBe(PLATFORM_HOME_PATH);
  });

  it("租户用户回租户控制台入口（再解析到默认首页）", () => {
    const { result } = renderHook(() => useDefaultHomePath(), {
      wrapper: wrapperWithUser(userWithActor("tenant_user")),
    });

    expect(result.current).toBe(APP_HOME_ENTRY_PATH);
  });

  it("用户还没加载出来时按租户侧处理", () => {
    const { result } = renderHook(() => useDefaultHomePath(), {
      wrapper: wrapperWithUser(null),
    });

    expect(result.current).toBe(APP_HOME_ENTRY_PATH);
  });
});
