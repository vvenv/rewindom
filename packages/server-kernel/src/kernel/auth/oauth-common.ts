import { createHash } from "node:crypto";

import {
  AppError,
  UnauthorizedError,
  ValidationError,
} from "../../lib/app-errors.js";
import { config } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";

import { AuthService, type JwtSignPayload } from "./auth.service.js";

import type { ResolvedOAuthCredentials } from "./oauth-credentials.js";
import type { HostTenantContext } from "../../lib/host-tenant.js";
import type { ProviderRegistry } from "../../runtime/provider-registry.js";
import type { AuthActorType, AuthTokens } from "@be-water/shared";

export type OAuthProviderId = "github" | "google" | "microsoft";

export interface OAuthProfile {
  provider_user_id: string;
  username: string;
  email: string | null;
  /** IdP 声明邮箱已验证时为 true；会员自动绑定时要求 true */
  email_verified: boolean;
  display_name: string | null;
  avatar_url: string | null;
}

export interface OAuthLoginResult {
  user: {
    id: string;
    username: string;
    actor_type: AuthActorType;
    is_system_admin: boolean;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
    last_access_at: Date | null;
  };
  tokens: AuthTokens;
  tenant_slug: string;
}

/** 将第三方 login / email local-part 规范为本地 username（3–50）。 */
export function normalizeOAuthUsername(login: string): string {
  let username = login
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  if (username.length === 0) {
    username = `u_${createHash("sha256").update(login).digest("hex").slice(0, 8)}`;
  }
  if (username.length < 3) {
    username = `u_${username}`.slice(0, 50);
  }
  return username.slice(0, 50);
}

export function oauthStateType(provider: OAuthProviderId): string {
  return `oauth_${provider}_state`;
}

export type OAuthCallbackSurface = "auth" | "member";

/**
 * 回调 URL 优先级：
 * 1. 解析后凭证上的 callbackUrl（租户覆盖或 env）
 * 2. FRONTEND_URL
 * 3. 请求 Origin
 */
export function resolveOAuthCallbackUrl(
  provider: OAuthProviderId,
  requestUrlOrigin: string,
  credentials?: Pick<ResolvedOAuthCredentials, "callbackUrl"> | null,
  surface: OAuthCallbackSurface = "auth",
): string {
  const explicit = credentials?.callbackUrl?.trim();
  if (explicit) {
    return explicit;
  }
  const frontend = config.frontend.url.trim();
  if (frontend) {
    return `${frontend.replace(/\/$/, "")}/api/${surface}/oauth/${provider}/callback`;
  }
  return `${requestUrlOrigin.replace(/\/$/, "")}/api/${surface}/oauth/${provider}/callback`;
}

/**
 * 会员 OAuth：平台应用须登记固定主域回调；租户覆盖可自带 callbackUrl。
 * 无显式 callback 时强制走 FRONTEND_URL（不回退发起 Host），以便 custom_domain 用 code 跳回。
 *
 * 平台 env 的 `*_CALLBACK_URL` 是工作台 `/api/auth/oauth/...` 地址，**不能**复用到会员流，
 * 否则 Google 会把带 `member_oauth_*_state` 的回调打到 auth handler → state typ 校验失败。
 */
export function resolveMemberOAuthCallbackUrl(
  provider: OAuthProviderId,
  credentials: Pick<ResolvedOAuthCredentials, "callbackUrl">,
): string {
  const explicit = credentials.callbackUrl?.trim();
  // 仅接受会员面回调；工作台 auth 回调（含平台 env 默认值）一律忽略。
  if (explicit && /\/api\/member\/oauth\//u.test(explicit)) {
    return explicit;
  }
  const frontend = config.frontend.url.trim();
  if (!frontend) {
    throw new AppError({
      code: "auth.oauth_callback_unconfigured",
      status: 503,
    });
  }
  return `${frontend.replace(/\/$/, "")}/api/member/oauth/${provider}/callback`;
}

export function verifyOAuthState(
  provider: OAuthProviderId,
  state: string,
  jwtVerify: (token: string) => { typ?: string },
): void {
  let decoded: { typ?: string };
  try {
    decoded = jwtVerify(state);
  } catch {
    throw new ValidationError("auth.oauth_state_invalid");
  }
  if (decoded.typ !== oauthStateType(provider)) {
    throw new ValidationError("auth.oauth_state_invalid");
  }
}

export async function completeOAuthLogin(params: {
  provider: OAuthProviderId;
  profile: OAuthProfile;
  jwtSign: (payload: JwtSignPayload) => string;
  registry: ProviderRegistry;
  ip: string;
  userAgent: string;
  hostTenant?: HostTenantContext | null;
}): Promise<OAuthLoginResult> {
  const existing = await prisma.oAuthAccount.findUnique({
    where: {
      provider_provider_user_id: {
        provider: params.provider,
        provider_user_id: params.profile.provider_user_id,
      },
    },
    include: { user: { select: { tenant_id: true } } },
  });

  if (existing) {
    if (
      params.hostTenant &&
      existing.user.tenant_id !== params.hostTenant.tenant_id
    ) {
      throw new ValidationError("auth.tenant_host_mismatch");
    }
    return AuthService.issueSessionForUser(existing.user_id, params.jwtSign);
  }

  const registered = await params.registry
    .getTenantRegistrationProvider()
    .registerOAuthTenant(
      {
        provider: params.provider,
        provider_user_id: params.profile.provider_user_id,
        username: params.profile.username,
        email: params.profile.email,
        display_name: params.profile.display_name,
        avatar_url: params.profile.avatar_url,
      },
      params.jwtSign,
      params.ip,
      params.userAgent,
      { hostTenant: params.hostTenant ?? null },
    );

  const session = await AuthService.getUserById(
    registered.user_id,
    "tenant_user",
  );

  return {
    user: session,
    tokens: registered.tokens,
    tenant_slug: registered.tenant_slug,
  };
}

function oauthFrontendBase(requestOrigin?: string | null): string {
  const origin = requestOrigin?.trim();
  if (origin) {
    return origin.replace(/\/$/u, "");
  }
  return (config.frontend.url || "http://localhost:7300").replace(/\/$/u, "");
}

export function buildOAuthFrontendSuccessRedirect(
  result: OAuthLoginResult,
  requestOrigin?: string | null,
): string {
  const url = new URL("/auth/oauth/callback", oauthFrontendBase(requestOrigin));
  const hash = new URLSearchParams({
    access_token: result.tokens.accessToken,
    refresh_token: result.tokens.refreshToken,
  });
  return `${url.toString()}#${hash.toString()}`;
}

export function buildOAuthFrontendErrorRedirect(
  errorCode: string,
  requestOrigin?: string | null,
): string {
  const url = new URL("/auth/oauth/callback", oauthFrontendBase(requestOrigin));
  url.searchParams.set("error", errorCode);
  return url.toString();
}

export function mapOAuthErrorCode(error: unknown): string {
  if (error instanceof AppError && error.code) {
    return error.code;
  }
  if (error instanceof UnauthorizedError && error.code) {
    return error.code;
  }
  if (error instanceof ValidationError && error.code) {
    return error.code;
  }
  return "auth.oauth_failed";
}

export function requestOriginFromHeaders(request: {
  protocol: string;
  headers: Record<string, string | string[] | undefined>;
}): string | null {
  const protoHeader = request.headers["x-forwarded-proto"];
  const hostHeader = request.headers["x-forwarded-host"] ?? request.headers.host;
  const proto = (
    Array.isArray(protoHeader) ? protoHeader[0] : protoHeader
  )
    ?.split(",")[0]
    ?.trim() || request.protocol;
  const host = (Array.isArray(hostHeader) ? hostHeader[0] : hostHeader)
    ?.split(",")[0]
    ?.trim();
  if (!host) return null;
  return `${proto}://${host}`;
}
