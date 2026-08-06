import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { shouldClearAuthOnError } from "@be-water/client-kit";

import { siteMemberApi, SITE_MEMBER_API_BASE } from "../lib/site-member-api.js";
import {
  clearMemberTokens,
  getMemberRefreshToken,
  hasMemberTokens,
  MEMBER_AUTH_LOGOUT_EVENT,
  setMemberTokens,
} from "../lib/site-member-session.js";

import type {
  SiteMemberChangePasswordBody,
  SiteMemberLoginBody,
  SiteMemberProfile,
  SiteMemberRegisterBody,
  SiteMemberSession,
  SiteMemberUpdateProfileBody,
} from "../../shared/site-member.js";

interface SiteMemberAuthState {
  member: SiteMemberProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface SiteMemberAuthContextValue extends SiteMemberAuthState {
  login: (body: SiteMemberLoginBody) => Promise<SiteMemberProfile>;
  register: (body: SiteMemberRegisterBody) => Promise<SiteMemberProfile>;
  logout: () => Promise<void>;
  updateProfile: (
    body: SiteMemberUpdateProfileBody,
  ) => Promise<SiteMemberProfile>;
  changePassword: (body: SiteMemberChangePasswordBody) => Promise<void>;
}

const SiteMemberAuthContext = createContext<
  SiteMemberAuthContextValue | undefined
>(undefined);

/**
 * 站点会员会话。
 *
 * 刻意不复用 `AuthProvider`：那套的 401 处理会把人重定向到工作台登录页，
 * 而会员失效时应该留在站点里、只是变回访客。
 */
export function SiteMemberAuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [state, setState] = useState<SiteMemberAuthState>(() => ({
    member: null,
    isAuthenticated: hasMemberTokens(),
    // 本地没有 token 就没有可恢复的会话，直接按访客渲染，省掉一次 /me
    isLoading: hasMemberTokens(),
  }));

  const applySession = useCallback((session: SiteMemberSession) => {
    setMemberTokens({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
    });
    setState({
      member: session.member,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const clearSession = useCallback(() => {
    clearMemberTokens();
    setState({ member: null, isAuthenticated: false, isLoading: false });
  }, []);

  const login = useCallback(
    async (body: SiteMemberLoginBody) => {
      const session = await siteMemberApi.post<SiteMemberSession>(
        `${SITE_MEMBER_API_BASE}/login`,
        body,
        undefined,
        true,
      );
      applySession(session);
      return session.member;
    },
    [applySession],
  );

  const register = useCallback(
    async (body: SiteMemberRegisterBody) => {
      const session = await siteMemberApi.post<SiteMemberSession>(
        `${SITE_MEMBER_API_BASE}/register`,
        body,
        undefined,
        true,
      );
      applySession(session);
      return session.member;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const refreshToken = getMemberRefreshToken();
    try {
      if (refreshToken) {
        await siteMemberApi.post(
          `${SITE_MEMBER_API_BASE}/logout`,
          { refresh_token: refreshToken },
          undefined,
          true,
        );
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(
    async (body: SiteMemberUpdateProfileBody) => {
      const member = await siteMemberApi.patch<SiteMemberProfile>(
        `${SITE_MEMBER_API_BASE}/profile`,
        body,
      );
      setState((prev) => ({ ...prev, member }));
      return member;
    },
    [],
  );

  const changePassword = useCallback(
    async (body: SiteMemberChangePasswordBody) => {
      await siteMemberApi.post(
        `${SITE_MEMBER_API_BASE}/change-password`,
        body,
      );
      // 服务端会吊销全部 refresh token，本地会话必须一起作废
      clearSession();
    },
    [clearSession],
  );

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    if (!hasMemberTokens()) return;

    void siteMemberApi
      .get<SiteMemberProfile>(`${SITE_MEMBER_API_BASE}/me`)
      .then((member) => {
        setState({ member, isAuthenticated: true, isLoading: false });
      })
      .catch((error: unknown) => {
        if (shouldClearAuthOnError(error)) {
          clearSession();
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      });
  }, [clearSession]);

  useEffect(() => {
    const handleLogout = (): void => clearSession();
    window.addEventListener(MEMBER_AUTH_LOGOUT_EVENT, handleLogout);
    return () =>
      window.removeEventListener(MEMBER_AUTH_LOGOUT_EVENT, handleLogout);
  }, [clearSession]);

  return (
    <SiteMemberAuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </SiteMemberAuthContext.Provider>
  );
}

export function useSiteMemberAuth(): SiteMemberAuthContextValue {
  const context = useContext(SiteMemberAuthContext);
  if (!context) {
    throw new Error("useSiteMemberAuth 必须在 SiteMemberAuthProvider 内使用");
  }
  return context;
}

/** 官网页面可能在没有 Provider 的环境下渲染（构建期预渲染）；此时按访客处理。 */
export function useOptionalSiteMemberAuth(): SiteMemberAuthContextValue | null {
  return useContext(SiteMemberAuthContext) ?? null;
}
