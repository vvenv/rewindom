import { config } from "@rewindom/server-kernel/lib/config.js";
import {
  MEMBER_ACCESS_COOKIE,
  MEMBER_ACCESS_COOKIE_MAX_AGE,
  MEMBER_REFRESH_COOKIE,
  MEMBER_REFRESH_COOKIE_MAX_AGE,
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

/** 登录 / 刷新成功后写入双 JWT cookie。 */
export function setMemberAuthCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string },
): void {
  const base = cookieBaseOptions();
  void reply.setCookie(MEMBER_ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: MEMBER_ACCESS_COOKIE_MAX_AGE,
  });
  void reply.setCookie(MEMBER_REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: MEMBER_REFRESH_COOKIE_MAX_AGE,
  });
}

/** 登出或会话失效时清掉会员 cookie。 */
export function clearMemberAuthCookies(reply: FastifyReply): void {
  const base = cookieBaseOptions();
  void reply.clearCookie(MEMBER_ACCESS_COOKIE, base);
  void reply.clearCookie(MEMBER_REFRESH_COOKIE, base);
}

export function readMemberAccessCookie(
  request: FastifyRequest,
): string | undefined {
  const value = request.cookies?.[MEMBER_ACCESS_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readMemberRefreshCookie(
  request: FastifyRequest,
): string | undefined {
  const value = request.cookies?.[MEMBER_REFRESH_COOKIE];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
