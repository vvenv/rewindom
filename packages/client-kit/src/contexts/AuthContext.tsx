import { createContext, useState, useCallback, useEffect, useRef } from "react";

import { api, shouldClearAuthOnError } from "../api.js";
import { clearStoredAuthTokens } from "../lib/auth-token-storage.js";

import type { AuthState } from "../auth-types.js";
import type {
  ChangePasswordData,
  LoginCredentials,
  LoginRequires2fa,
  User,
} from "@rewindom/shared";

export type LoginResult = User | LoginRequires2fa;

export function isLoginRequires2fa(
  result: LoginResult,
): result is LoginRequires2fa {
  return "requires_2fa" in result && result.requires_2fa === true;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  /** Cookie 已由服务端种下后，拉 /auth/me 建立前端会话（OAuth / 注册）。 */
  establishSession: () => Promise<User>;
  /** 提交 2FA 验证码 / 恢复码，种 cookie 并建立会话。 */
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (data: ChangePasswordData) => Promise<void>;
  getCurrentUser: () => Promise<User>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

export interface AuthProviderProps {
  children: React.ReactNode;
  onLogout?: () => void;
}

export function AuthProvider({ children, onLogout }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    isAuthenticated: false,
    // Cookie 模式下启动时不知道有没有会话，先 loading 再打 /me。
    isLoading: true,
  }));

  const clearAuth = useCallback(() => {
    clearStoredAuthTokens();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const setAuthUser = useCallback((user: User) => {
    setState({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult> => {
      const data = await api.post<
        | { user: User; tenant_slug?: string | null; expires_in?: number }
        | LoginRequires2fa
      >("/auth/login", credentials, undefined, true);
      if ("requires_2fa" in data && data.requires_2fa) {
        return data;
      }
      setAuthUser(data.user);
      return data.user;
    },
    [setAuthUser],
  );

  const verifyTwoFactor = useCallback(
    async (challengeToken: string, code: string): Promise<User> => {
      const data = await api.post<{ user: User }>(
        "/auth/2fa/verify",
        { challenge_token: challengeToken, code },
        undefined,
        true,
      );
      setAuthUser(data.user);
      return data.user;
    },
    [setAuthUser],
  );

  const establishSession = useCallback(async (): Promise<User> => {
    setState((prev) => ({ ...prev, isLoading: true }));
    const user = await api.get<User>("/auth/me");
    setAuthUser(user);
    return user;
  }, [setAuthUser]);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", {}, undefined, true);
    } catch (error) {
      console.error("退出登录出错:", error);
    } finally {
      onLogout?.();
      clearAuth();
    }
  }, [clearAuth, onLogout]);

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    await api.post("/auth/change-password", data);
  }, []);

  const getCurrentUser = useCallback(async (): Promise<User> => {
    const user = await api.get<User>("/auth/me");
    setAuthUser(user);
    return user;
  }, [setAuthUser]);

  const syncCurrentUser = useCallback(async (): Promise<void> => {
    try {
      await getCurrentUser();
    } catch (error) {
      console.error("获取用户信息失败:", error);
      if (shouldClearAuthOnError(error)) {
        clearAuth();
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
  }, [getCurrentUser, clearAuth]);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    // 清掉升级前残留的 localStorage Bearer，避免误导排查。
    clearStoredAuthTokens();
    void syncCurrentUser();
  }, [syncCurrentUser]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void syncCurrentUser();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [syncCurrentUser]);

  useEffect(() => {
    const handleAuthLogout = () => {
      clearAuth();
      window.location.href = "/login";
    };

    window.addEventListener("authLogout", handleAuthLogout as EventListener);

    return () => {
      window.removeEventListener(
        "authLogout",
        handleAuthLogout as EventListener,
      );
    };
  }, [clearAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    establishSession,
    verifyTwoFactor,
    logout,
    changePassword,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
