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

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_EMAILS_URL = "https://api.github.com/user/emails";
const PROVIDER = "github" as const;

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

export { normalizeOAuthUsername, mapOAuthErrorCode } from "./oauth-common.js";

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

async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
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
    assertGithubConfigured();

    const accessToken = await exchangeCodeForAccessToken(
      params.code,
      params.callbackUrl,
    );
    const profile = await fetchGithubProfile(accessToken);

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
