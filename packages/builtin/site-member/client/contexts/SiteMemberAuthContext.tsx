import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { shouldClearAuthOnError } from "@rewindom/client-kit";

import { siteMemberApi, SITE_MEMBER_API_BASE } from "../lib/site-member-api.js";
import { MEMBER_AUTH_LOGOUT_EVENT } from "../lib/site-member-session.js";

import type {
  SiteMemberProfile,
  SiteMemberSession,
} from "../../shared/site-member.js";

interface SiteMemberAuthState {
  member: SiteMemberProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/**
 * SPA 侧只剩三件事：读会话、走完 OAuth 回调、退出。
 *
 * 登录 / 注册 / 改资料 / 改密码都在 SSR 页面上用真表单做（`/member/login`、
 * `/member/account`），JSON 接口仍在（`/api/member/*`），只是这个 Provider 不再
 * 代理它们——留着四个没人调的方法，下一个人会以为 SPA 上还有那些页面。
 */
export interface SiteMemberAuthContextValue extends SiteMemberAuthState {
  completeOAuthExchange: (code: string) => Promise<SiteMemberProfile>;
  logout: () => Promise<void>;
}

const SiteMemberAuthContext = createContext<
  SiteMemberAuthContextValue | undefined
>(undefined);

/**
 * 站点会员会话（HttpOnly cookie）。
 *
 * 刻意不复用 `AuthProvider`：那套的 401 处理会把人重定向到工作台登录页，
 * 而会员失效时应该留在站点里、只是变回访客。
 */
export function SiteMemberAuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [state, setState] = useState<SiteMemberAuthState>({
    member: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const applySession = useCallback((session: SiteMemberSession) => {
    setState({
      member: session.member,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const clearSession = useCallback(() => {
    setState({ member: null, isAuthenticated: false, isLoading: false });
  }, []);

  const completeOAuthExchange = useCallback(
    async (code: string) => {
      const session = await siteMemberApi.post<SiteMemberSession>(
        `${SITE_MEMBER_API_BASE}/oauth/exchange`,
        { code },
        undefined,
        true,
      );
      applySession(session);
      return session.member;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await siteMemberApi.post(
        `${SITE_MEMBER_API_BASE}/logout`,
        {},
        undefined,
        true,
      );
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

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
        completeOAuthExchange,
        logout,
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
