import { config } from "@rewindom/server-kernel/lib/config.js";
import {
  WORKBENCH_ACCESS_COOKIE,
  WORKBENCH_ACCESS_COOKIE_MAX_AGE,
  WORKBENCH_IMPERSONATION_RETURN_COOKIE,
  WORKBENCH_REFRESH_COOKIE,
  WORKBENCH_REFRESH_COOKIE_MAX_AGE,
  type AuthTokens,
} from "@rewindom/shared";

import type { FastifyReply, FastifyRequest } from "fastify";

function cookieBaseOptions(): {
  path: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
} {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: config.server.isProduction,
  };
}

/** 登录 / 刷新 / OAuth / 模拟登录成功后写入双 JWT cookie。 */
export function setWorkbenchAuthCookies(
  reply: FastifyReply,
  tokens: AuthTokens,
): void {
  const base = cookieBaseOptions();
  void reply.setCookie(WORKBENCH_ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: WORKBENCH_ACCESS_COOKIE_MAX_AGE,
  });
  void reply.setCookie(WORKBENCH_REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: WORKBENCH_REFRESH_COOKIE_MAX_AGE,
  });
}

/** 登出或会话失效时清掉工作台 cookie。 */
export function clearWorkbenchAuthCookies(reply: FastifyReply): void {
  const base = cookieBaseOptions();
  void reply.clearCookie(WORKBENCH_ACCESS_COOKIE, base);
  void reply.clearCookie(WORKBENCH_REFRESH_COOKIE, base);
}

export function readWorkbenchAccessCookie(
  request: FastifyRequest,
): string | undefined {
  const value = request.cookies?.[WORKBENCH_ACCESS_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readWorkbenchRefreshCookie(
  request: FastifyRequest,
): string | undefined {
  const value = request.cookies?.[WORKBENCH_REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * 模拟登录：把当前平台会话塞进 return cookie，再换成租户用户 cookie。
 * payload 为 JSON `{ accessToken, refreshToken }`。
 */
export function setWorkbenchImpersonationReturnCookie(
  reply: FastifyReply,
  tokens: AuthTokens,
): void {
  void reply.setCookie(
    WORKBENCH_IMPERSONATION_RETURN_COOKIE,
    JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    }),
    {
      ...cookieBaseOptions(),
      maxAge: WORKBENCH_REFRESH_COOKIE_MAX_AGE,
    },
  );
}

export function clearWorkbenchImpersonationReturnCookie(
  reply: FastifyReply,
): void {
  void reply.clearCookie(
    WORKBENCH_IMPERSONATION_RETURN_COOKIE,
    cookieBaseOptions(),
  );
}

export function readWorkbenchImpersonationReturnCookie(
  request: FastifyRequest,
): AuthTokens | null {
  const raw = request.cookies?.[WORKBENCH_IMPERSONATION_RETURN_COOKIE];
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthTokens>;
    if (
      typeof parsed.accessToken === "string" &&
      parsed.accessToken.length > 0 &&
      typeof parsed.refreshToken === "string" &&
      parsed.refreshToken.length > 0
    ) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      };
    }
  } catch {
    return null;
  }
  return null;
}
