import { createContext, useState, useCallback, useEffect, useRef } from "react";

import { api, shouldClearAuthOnError } from "../api.js";
import {
  clearStoredAuthTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredAuthTokens,
} from "../lib/auth-token-storage.js";

import type { AuthState } from "../auth-types.js";
import type { AuthTokens, ChangePasswordData, LoginCredentials, User } from "@rewindom/shared";


export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<User>;
  /** OAuth 回调等场景：已有双 Token 时写入会话并拉取 /auth/me */
  loginWithTokens: (tokens: AuthTokens) => Promise<User>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
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
  const [state, setState] = useState<AuthState>(() => {
    const accessToken = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();

    return {
      user: null,
      accessToken,
      refreshToken,
      isAuthenticated: Boolean(accessToken) && Boolean(refreshToken),
      isLoading: Boolean(accessToken) && Boolean(refreshToken),
    };
  });

  const clearAuth = useCallback(() => {
    clearStoredAuthTokens();
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const setAuth = useCallback((user: User, tokens: AuthTokens) => {
    setStoredAuthTokens(tokens);
    setState({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<User> => {
      const data = await api.post<{ user: User; tokens: AuthTokens }>(
        "/auth/login",
        credentials,
        undefined,
        true,
      );
      setAuth(data.user, data.tokens);
      return data.user;
    },
    [setAuth],
  );

  const loginWithTokens = useCallback(
    async (tokens: AuthTokens): Promise<User> => {
      setStoredAuthTokens(tokens);
      setState((prev) => ({
        ...prev,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        isAuthenticated: true,
        isLoading: true,
      }));
      const user = await api.get<User>("/auth/me");
      setAuth(user, tokens);
      return user;
    },
    [setAuth],
  );

  const logout = useCallback(async () => {
    const { refreshToken } = state;

    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken }, undefined, true);
      }
    } catch (error) {
      console.error("退出登录出错:", error);
    } finally {
      onLogout?.();
      clearAuth();
    }
  }, [state, clearAuth, onLogout]);

  const refreshAccessToken = useCallback(async () => {
    const { refreshToken } = state;

    if (!refreshToken) {
      throw new Error("没有可用的刷新令牌");
    }

    try {
      const tokens = await api.post<AuthTokens>(
        "/auth/refresh",
        { refreshToken },
        undefined,
        true,
      );
      setStoredAuthTokens(tokens);

      setState((prev) => ({
        ...prev,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }));
    } catch (error) {
      if (shouldClearAuthOnError(error)) {
        clearAuth();
      }
      throw error;
    }
  }, [state, clearAuth]);

  const changePassword = useCallback(async (data: ChangePasswordData) => {
    await api.post("/auth/change-password", data);
  }, []);

  const getCurrentUser = useCallback(async (): Promise<User> => {
    const user = await api.get<User>("/auth/me");

    setState((prev) => ({
      ...prev,
      user,
      isLoading: false,
    }));

    return user;
  }, []);

  const syncCurrentUser = useCallback(async (): Promise<void> => {
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

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
    const handleTokenRefreshed = (event: CustomEvent) => {
      const { accessToken, refreshToken } = event.detail;
      setState((prev) => ({
        ...prev,
        accessToken,
        refreshToken,
      }));
    };

    const handleAuthLogout = () => {
      clearAuth();
      window.location.href = "/login";
    };

    window.addEventListener(
      "tokenRefreshed",
      handleTokenRefreshed as EventListener,
    );
    window.addEventListener("authLogout", handleAuthLogout as EventListener);

    return () => {
      window.removeEventListener(
        "tokenRefreshed",
        handleTokenRefreshed as EventListener,
      );
      window.removeEventListener(
        "authLogout",
        handleAuthLogout as EventListener,
      );
    };
  }, [clearAuth]);

  const value: AuthContextType = {
    ...state,
    login,
    loginWithTokens,
    logout,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
