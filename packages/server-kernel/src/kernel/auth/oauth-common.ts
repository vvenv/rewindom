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
import type { AuthActorType, AuthTokens } from "@rewindom/shared";

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

/** 会员 OAuth state typ：`member_oauth_{provider}_state` */
export function memberOAuthStateType(provider: OAuthProviderId): string {
  return `member_${oauthStateType(provider)}`;
}

export function isMemberOAuthStateTyp(
  typ: string | undefined,
  provider: OAuthProviderId,
): boolean {
  return typ === memberOAuthStateType(provider);
}

/**
 * 工作台与会员共用同一条 IdP Redirect URI（`/api/auth/oauth/{provider}/callback`），
 * 回调里按 state JWT 的 `typ` 分流。
 *
 * 优先级：
 * 1. 解析后凭证上的 callbackUrl（租户覆盖或 env `*_CALLBACK_URL`）
 * 2. FRONTEND_URL + 统一路径
 * 3. 请求 Origin + 统一路径（仅工作台 start 可回退；会员见 resolveMemberOAuthCallbackUrl）
 */
export function resolveOAuthCallbackUrl(
  provider: OAuthProviderId,
  requestUrlOrigin: string,
  credentials?: Pick<ResolvedOAuthCredentials, "callbackUrl"> | null,
): string {
  const explicit = credentials?.callbackUrl?.trim();
  if (explicit) {
    return explicit;
  }
  const frontend = config.frontend.url.trim();
  if (frontend) {
    return `${frontend.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
  }
  return `${requestUrlOrigin.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
}

/**
 * 会员 OAuth 回调 URL：与工作台同一条 URI。
 * 无显式 callback 时强制走 FRONTEND_URL（不回退发起 Host），以便 custom_domain 用 code 跳回。
 */
export function resolveMemberOAuthCallbackUrl(
  provider: OAuthProviderId,
  credentials: Pick<ResolvedOAuthCredentials, "callbackUrl">,
): string {
  const explicit = credentials.callbackUrl?.trim();
  if (explicit) {
    return explicit;
  }
  const frontend = config.frontend.url.trim();
  if (!frontend) {
    throw new AppError({
      code: "auth.oauth_callback_unconfigured",
      status: 503,
    });
  }
  return `${frontend.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
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

/** 会员 OAuth 前端落地页（非 IdP Redirect URI）。 */
export function buildMemberOAuthFrontendRedirect(params: {
  returnOrigin: string;
  code?: string;
  error?: string;
  redirect?: string;
}): string {
  const url = new URL("/member/oauth/callback", params.returnOrigin);
  if (params.code) {
    url.searchParams.set("code", params.code);
  }
  if (params.error) {
    url.searchParams.set("error", params.error);
  }
  if (params.redirect && params.redirect !== "/member/account") {
    url.searchParams.set("redirect", params.redirect);
  }
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

export { requestOriginFromHeaders } from "../../lib/host-tenant.js";
