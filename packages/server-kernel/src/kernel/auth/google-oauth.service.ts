import { AppError } from "../../lib/app-errors.js";
import { config } from "../../lib/config.js";

import {
  buildOAuthFrontendErrorRedirect,
  buildOAuthFrontendSuccessRedirect,
  completeOAuthLogin,
  normalizeOAuthUsername,
  resolveOAuthCallbackUrl,
  verifyOAuthState,
  type OAuthLoginResult,
  type OAuthProfile,
} from "./oauth-common.js";

import type { JwtSignPayload } from "./auth.service.js";
import type { HostTenantContext } from "../../lib/host-tenant.js";
import type { ProviderRegistry } from "../../runtime/provider-registry.js";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const PROVIDER = "google" as const;

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
}

function assertGoogleConfigured(): void {
  if (!config.auth.google.enabled) {
    throw new AppError({ code: "auth.oauth_not_configured", status: 503 });
  }
}

export function buildGoogleAuthorizeUrl(params: {
  state: string;
  callbackUrl: string;
}): string {
  assertGoogleConfigured();
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.auth.google.clientId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

async function exchangeCodeForAccessToken(
  code: string,
  callbackUrl: string,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: config.auth.google.clientId,
    client_secret: config.auth.google.clientSecret,
    redirect_uri: callbackUrl,
    grant_type: "authorization_code",
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new AppError({ code: "auth.oauth_exchange_failed", status: 502 });
  }

  const data = (await response.json()) as GoogleTokenResponse;
  if (!data.access_token) {
    throw new AppError({
      code: "auth.oauth_exchange_failed",
      status: 502,
      params: { detail: data.error_description ?? data.error },
    });
  }
  return data.access_token;
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new AppError({ code: "auth.oauth_profile_failed", status: 502 });
  }

  const user = (await response.json()) as GoogleUserInfoResponse;
  if (!user.sub) {
    throw new AppError({ code: "auth.oauth_profile_failed", status: 502 });
  }

  const email =
    user.email && user.email_verified !== false ? user.email : (user.email ?? null);
  const emailLocal = email?.split("@")[0] ?? "";
  const usernameSource =
    emailLocal || user.given_name || user.name || `google_${user.sub}`;

  return {
    provider_user_id: user.sub,
    username: normalizeOAuthUsername(usernameSource),
    email,
    display_name: user.name ?? null,
    avatar_url: user.picture ?? null,
  };
}

export class GoogleOAuthService {
  static resolveCallbackUrl(requestUrlOrigin: string): string {
    return resolveOAuthCallbackUrl(PROVIDER, requestUrlOrigin);
  }

  static verifyState(
    state: string,
    jwtVerify: (token: string) => { typ?: string },
  ): void {
    verifyOAuthState(PROVIDER, state, jwtVerify);
  }

  static async completeLogin(params: {
    code: string;
    callbackUrl: string;
    jwtSign: (payload: JwtSignPayload) => string;
    registry: ProviderRegistry;
    ip: string;
    userAgent: string;
    hostTenant?: HostTenantContext | null;
  }): Promise<OAuthLoginResult> {
    assertGoogleConfigured();

    const accessToken = await exchangeCodeForAccessToken(
      params.code,
      params.callbackUrl,
    );
    const profile = await fetchGoogleProfile(accessToken);

    return completeOAuthLogin({
      provider: PROVIDER,
      profile,
      jwtSign: params.jwtSign,
      registry: params.registry,
      ip: params.ip,
      userAgent: params.userAgent,
      hostTenant: params.hostTenant,
    });
  }

  static buildFrontendSuccessRedirect(
    result: OAuthLoginResult,
    requestOrigin?: string | null,
  ): string {
    return buildOAuthFrontendSuccessRedirect(result, requestOrigin);
  }

  static buildFrontendErrorRedirect(
    errorCode: string,
    requestOrigin?: string | null,
  ): string {
    return buildOAuthFrontendErrorRedirect(errorCode, requestOrigin);
  }
}
