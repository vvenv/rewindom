import { AppError } from "../../lib/app-errors.js";

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
import type { ResolvedOAuthCredentials } from "./oauth-credentials.js";
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

function assertCredentials(credentials: ResolvedOAuthCredentials): void {
  if (!credentials.enabled || credentials.provider !== PROVIDER) {
    throw new AppError({ code: "auth.oauth_not_configured", status: 503 });
  }
}

export function buildGoogleAuthorizeUrl(params: {
  state: string;
  callbackUrl: string;
  credentials: ResolvedOAuthCredentials;
}): string {
  assertCredentials(params.credentials);
  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", params.credentials.clientId);
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
  credentials: ResolvedOAuthCredentials,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
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

export async function fetchGoogleProfile(
  accessToken: string,
): Promise<OAuthProfile> {
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

  const emailVerified = user.email_verified === true;
  const email = user.email ?? null;
  const emailLocal = email?.split("@")[0] ?? "";
  const usernameSource =
    emailLocal || user.given_name || user.name || `google_${user.sub}`;

  return {
    provider_user_id: user.sub,
    username: normalizeOAuthUsername(usernameSource),
    email,
    email_verified: emailVerified,
    display_name: user.name ?? null,
    avatar_url: user.picture ?? null,
  };
}

export class GoogleOAuthService {
  static resolveCallbackUrl(
    requestUrlOrigin: string,
    credentials: ResolvedOAuthCredentials,
  ): string {
    return resolveOAuthCallbackUrl(PROVIDER, requestUrlOrigin, credentials);
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
    credentials: ResolvedOAuthCredentials;
    jwtSign: (payload: JwtSignPayload) => string;
    registry: ProviderRegistry;
    ip: string;
    userAgent: string;
    hostTenant?: HostTenantContext | null;
  }): Promise<OAuthLoginResult> {
    assertCredentials(params.credentials);

    const accessToken = await exchangeCodeForAccessToken(
      params.code,
      params.callbackUrl,
      params.credentials,
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

  static async fetchProfileFromCode(params: {
    code: string;
    callbackUrl: string;
    credentials: ResolvedOAuthCredentials;
  }): Promise<OAuthProfile> {
    assertCredentials(params.credentials);
    const accessToken = await exchangeCodeForAccessToken(
      params.code,
      params.callbackUrl,
      params.credentials,
    );
    return fetchGoogleProfile(accessToken);
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
