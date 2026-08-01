import { createHash } from "node:crypto";

import {
  AppError,
  UnauthorizedError,
  ValidationError,
} from "../../lib/app-errors.js";
import { config } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";

import { AuthService, type JwtSignPayload } from "./auth.service.js";

import type { ProviderRegistry } from "../../runtime/provider-registry.js";
import type { AuthActorType, AuthTokens } from "@be-water/shared";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
const OAUTH_STATE_TYPE = "oauth_github_state";
const PROVIDER = "github";

export interface GithubOAuthProfile {
  provider_user_id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface GithubOAuthLoginResult {
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

interface GithubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GithubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface GithubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

function assertGithubConfigured(): void {
  if (!config.auth.github.enabled) {
    throw new AppError({ code: "auth.oauth_not_configured", status: 503 });
  }
}

/** 将 GitHub login 规范为本地 username（3–50，字母数字下划线连字符）。 */
export function normalizeOAuthUsername(login: string): string {
  let username = login
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  if (username.length === 0) {
    username = `gh_${createHash("sha256").update(login).digest("hex").slice(0, 8)}`;
  }
  if (username.length < 3) {
    username = `gh_${username}`.slice(0, 50);
  }
  return username.slice(0, 50);
}

/**
 * 回调 URL 优先级：
 * 1. GITHUB_CALLBACK_URL（显式覆盖）
 * 2. FRONTEND_URL（本地 Vite 代理时 Host 可能变成 :3700，用前端源更稳）
 * 3. 请求 Origin（生产同源部署的兜底）
 */
export function resolveGithubCallbackUrl(requestUrlOrigin: string): string {
  if (config.auth.github.callbackUrl) {
    return config.auth.github.callbackUrl;
  }
  const frontend = config.frontend.url.trim();
  if (frontend) {
    return `${frontend.replace(/\/$/, "")}/api/auth/oauth/github/callback`;
  }
  return `${requestUrlOrigin.replace(/\/$/, "")}/api/auth/oauth/github/callback`;
}

export function buildGithubAuthorizeUrl(params: {
  state: string;
  callbackUrl: string;
}): string {
  assertGithubConfigured();
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.auth.github.clientId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", params.state);
  return url.toString();
}

export function verifyGithubOAuthState(
  state: string,
  jwtVerify: (token: string) => { typ?: string },
): void {
  let decoded: { typ?: string };
  try {
    decoded = jwtVerify(state);
  } catch {
    throw new ValidationError("auth.oauth_state_invalid");
  }
  if (decoded.typ !== OAUTH_STATE_TYPE) {
    throw new ValidationError("auth.oauth_state_invalid");
  }
}

async function exchangeCodeForAccessToken(
  code: string,
  callbackUrl: string,
): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.auth.github.clientId,
      client_secret: config.auth.github.clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  });

  if (!response.ok) {
    throw new AppError({ code: "auth.oauth_exchange_failed", status: 502 });
  }

  const body = (await response.json()) as GithubTokenResponse;
  if (!body.access_token) {
    throw new AppError({
      code: "auth.oauth_exchange_failed",
      status: 502,
      params: { detail: body.error_description ?? body.error },
    });
  }
  return body.access_token;
}

async function fetchGithubProfile(
  accessToken: string,
): Promise<GithubOAuthProfile> {
  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "be-water",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!userResponse.ok) {
    throw new AppError({ code: "auth.oauth_profile_failed", status: 502 });
  }
  const user = (await userResponse.json()) as GithubUserResponse;

  let email = user.email;
  if (!email) {
    const emailsResponse = await fetch(GITHUB_EMAILS_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "be-water",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as GithubEmailResponse[];
      const primary =
        emails.find((entry) => entry.primary && entry.verified) ??
        emails.find((entry) => entry.verified) ??
        emails[0];
      email = primary?.email ?? null;
    }
  }

  return {
    provider_user_id: String(user.id),
    username: normalizeOAuthUsername(user.login),
    email,
    display_name: user.name,
    avatar_url: user.avatar_url,
  };
}

export class GithubOAuthService {
  static async completeLogin(params: {
    code: string;
    callbackUrl: string;
    jwtSign: (payload: JwtSignPayload) => string;
    registry: ProviderRegistry;
    ip: string;
    userAgent: string;
  }): Promise<GithubOAuthLoginResult> {
    assertGithubConfigured();

    const accessToken = await exchangeCodeForAccessToken(
      params.code,
      params.callbackUrl,
    );
    const profile = await fetchGithubProfile(accessToken);

    const existing = await prisma.oAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider: PROVIDER,
          provider_user_id: profile.provider_user_id,
        },
      },
    });

    if (existing) {
      return AuthService.issueSessionForUser(existing.user_id, params.jwtSign);
    }

    const registered = await params.registry
      .getTenantRegistrationProvider()
      .registerOAuthTenant(
        {
          provider: PROVIDER,
          provider_user_id: profile.provider_user_id,
          username: profile.username,
          email: profile.email,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
        params.jwtSign,
        params.ip,
        params.userAgent,
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

  static buildFrontendSuccessRedirect(result: GithubOAuthLoginResult): string {
    const base = config.frontend.url || "http://localhost:7300";
    const url = new URL("/auth/oauth/callback", base);
    const hash = new URLSearchParams({
      access_token: result.tokens.accessToken,
      refresh_token: result.tokens.refreshToken,
    });
    return `${url.toString()}#${hash.toString()}`;
  }

  static buildFrontendErrorRedirect(errorCode: string): string {
    const base = config.frontend.url || "http://localhost:7300";
    const url = new URL("/auth/oauth/callback", base);
    url.searchParams.set("error", errorCode);
    return url.toString();
  }
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
