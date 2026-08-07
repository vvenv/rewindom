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

import type { ResolvedOAuthCredentials } from "./oauth-credentials.js";
import type { JwtSignPayload } from "./auth.service.js";
import type { HostTenantContext } from "../../lib/host-tenant.js";
import type { ProviderRegistry } from "../../runtime/provider-registry.js";

const GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me";
const PROVIDER = "microsoft" as const;

interface MicrosoftTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface MicrosoftGraphMeResponse {
  id?: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  givenName?: string | null;
}

function assertCredentials(credentials: ResolvedOAuthCredentials): void {
  if (!credentials.enabled || credentials.provider !== PROVIDER) {
    throw new AppError({ code: "auth.oauth_not_configured", status: 503 });
  }
}

function authorityBase(credentials: ResolvedOAuthCredentials): string {
  const authority = (credentials.authority || "common").replace(/^\/+|\/+$/g, "");
  return `https://login.microsoftonline.com/${authority}/oauth2/v2.0`;
}

export function buildMicrosoftAuthorizeUrl(params: {
  state: string;
  callbackUrl: string;
  credentials: ResolvedOAuthCredentials;
}): string {
  assertCredentials(params.credentials);
  const url = new URL(`${authorityBase(params.credentials)}/authorize`);
  url.searchParams.set("client_id", params.credentials.clientId);
  url.searchParams.set("redirect_uri", params.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", "openid profile email User.Read offline_access");
  url.searchParams.set("state", params.state);
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
    scope: "openid profile email User.Read",
  });

  const response = await fetch(`${authorityBase(credentials)}/token`, {
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

  const data = (await response.json()) as MicrosoftTokenResponse;
  if (!data.access_token) {
    throw new AppError({
      code: "auth.oauth_exchange_failed",
      status: 502,
      params: { detail: data.error_description ?? data.error },
    });
  }
  return data.access_token;
}

export async function fetchMicrosoftProfile(
  accessToken: string,
): Promise<OAuthProfile> {
  const response = await fetch(GRAPH_ME_URL, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    throw new AppError({ code: "auth.oauth_profile_failed", status: 502 });
  }

  const user = (await response.json()) as MicrosoftGraphMeResponse;
  if (!user.id) {
    throw new AppError({ code: "auth.oauth_profile_failed", status: 502 });
  }

  const emailCandidate = (user.mail || user.userPrincipalName || "").trim();
  const email =
    emailCandidate && emailCandidate.includes("@") ? emailCandidate : null;
  const emailLocal = email?.split("@")[0] ?? "";
  const usernameSource =
    emailLocal || user.givenName || user.displayName || `ms_${user.id}`;

  return {
    provider_user_id: user.id,
    username: normalizeOAuthUsername(usernameSource),
    email,
    // Graph 返回的工作/学校邮箱视为已验证；无邮箱则不可自动绑定
    email_verified: Boolean(email),
    display_name: user.displayName ?? null,
    avatar_url: null,
  };
}

export class MicrosoftOAuthService {
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
    const profile = await fetchMicrosoftProfile(accessToken);

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
    return fetchMicrosoftProfile(accessToken);
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
