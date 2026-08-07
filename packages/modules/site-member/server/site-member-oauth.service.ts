import { randomBytes, randomUUID } from "node:crypto";

import {
  buildGithubAuthorizeUrl,
  GithubOAuthService,
} from "@be-water/server-kernel/kernel/auth/github-oauth.service.js";
import {
  buildGoogleAuthorizeUrl,
  GoogleOAuthService,
} from "@be-water/server-kernel/kernel/auth/google-oauth.service.js";
import {
  buildMicrosoftAuthorizeUrl,
  MicrosoftOAuthService,
} from "@be-water/server-kernel/kernel/auth/microsoft-oauth.service.js";
import {
  oauthStateType,
  type OAuthProfile,
  type OAuthProviderId,
} from "@be-water/server-kernel/kernel/auth/oauth-common.js";
import {
  isOAuthProviderId,
  type ResolvedOAuthCredentials,
} from "@be-water/server-kernel/kernel/auth/oauth-credentials.js";
import {
  UnauthorizedError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { type AuthTokens } from "@be-water/shared";

import { toSiteMemberProfile } from "./site-member.mapper.js";

import type { SiteTenant } from "./site-member-tenant.js";
import type { SiteMemberProfile } from "../shared/site-member.js";
import type { JwtSignPayload } from "@be-water/server-kernel/kernel/auth/auth.service.js";

const EXCHANGE_CODE_TTL_MS = 2 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type JwtSign = (payload: JwtSignPayload) => string;

export interface MemberOAuthStatePayload {
  typ: string;
  nonce: string;
  tenant_id: string;
  return_origin: string;
  redirect: string;
}

export interface MemberOAuthLoginResult {
  member: SiteMemberProfile;
  tenant: SiteTenant;
  is_new_member: boolean;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateTokens(
  memberId: string,
  tenant: SiteTenant,
  jwtSign: JwtSign,
): AuthTokens {
  const base = {
    userId: memberId,
    actor_type: "site_member",
    is_system_admin: false,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
  } as const;

  return {
    accessToken: jwtSign({ ...base, type: "access" }),
    refreshToken: jwtSign({ ...base, type: "refresh", jti: randomUUID() }),
  };
}

async function persistRefreshToken(
  memberId: string,
  refreshToken: string,
): Promise<void> {
  await prisma.siteMemberRefreshToken.create({
    data: {
      member_id: memberId,
      token: refreshToken,
      expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
}

export function assertMemberOAuthProvider(
  value: string,
): asserts value is OAuthProviderId {
  if (!isOAuthProviderId(value)) {
    throw new ValidationError("site_member.oauth_provider_invalid");
  }
}

export function memberOAuthAuthorizeUrl(params: {
  provider: OAuthProviderId;
  state: string;
  callbackUrl: string;
  credentials: ResolvedOAuthCredentials;
}): string {
  switch (params.provider) {
    case "github":
      return buildGithubAuthorizeUrl(params);
    case "google":
      return buildGoogleAuthorizeUrl(params);
    case "microsoft":
      return buildMicrosoftAuthorizeUrl(params);
    default: {
      const _exhaustive: never = params.provider;
      void _exhaustive;
      throw new ValidationError("site_member.oauth_provider_invalid");
    }
  }
}

async function fetchProfile(
  provider: OAuthProviderId,
  params: {
    code: string;
    callbackUrl: string;
    credentials: ResolvedOAuthCredentials;
  },
): Promise<OAuthProfile> {
  switch (provider) {
    case "github":
      return GithubOAuthService.fetchProfileFromCode(params);
    case "google":
      return GoogleOAuthService.fetchProfileFromCode(params);
    case "microsoft":
      return MicrosoftOAuthService.fetchProfileFromCode(params);
    default: {
      const _exhaustive: never = provider;
      void _exhaustive;
      throw new ValidationError("site_member.oauth_provider_invalid");
    }
  }
}

export class SiteMemberOAuthService {
  static memberOAuthStateType(provider: OAuthProviderId): string {
    return `member_${oauthStateType(provider)}`;
  }

  static async completeOAuthLogin(params: {
    provider: OAuthProviderId;
    code: string;
    callbackUrl: string;
    credentials: ResolvedOAuthCredentials;
    tenant: SiteTenant;
  }): Promise<MemberOAuthLoginResult> {
    const profile = await fetchProfile(params.provider, {
      code: params.code,
      callbackUrl: params.callbackUrl,
      credentials: params.credentials,
    });

    const existing = await prisma.siteMemberOAuthAccount.findUnique({
      where: {
        tenant_id_provider_provider_user_id: {
          tenant_id: params.tenant.id,
          provider: params.provider,
          provider_user_id: profile.provider_user_id,
        },
      },
      include: { member: true },
    });

    if (existing) {
      if (!existing.member.enabled) {
        throw new UnauthorizedError("site_member.account_disabled");
      }
      if (existing.member.tenant_id !== params.tenant.id) {
        throw new ValidationError("site_member.oauth_tenant_mismatch");
      }
      const updated = await prisma.siteMember.update({
        where: { id: existing.member_id },
        data: {
          last_login_at: new Date(),
          failed_login_attempts: 0,
          locked_until: null,
        },
      });
      return {
        member: toSiteMemberProfile(updated),
        tenant: params.tenant,
        is_new_member: false,
      };
    }

    const email = profile.email ? normalizeEmail(profile.email) : null;
    if (!email) {
      throw new ValidationError("site_member.oauth_email_required");
    }

    let member = await prisma.siteMember.findUnique({
      where: {
        tenant_id_email: { tenant_id: params.tenant.id, email },
      },
    });
    let isNew = false;

    if (member) {
      if (!member.enabled) {
        throw new UnauthorizedError("site_member.account_disabled");
      }
      if (!profile.email_verified) {
        throw new ValidationError("site_member.oauth_email_unverified");
      }
    } else {
      if (!profile.email_verified) {
        throw new ValidationError("site_member.oauth_email_unverified");
      }
      member = await prisma.siteMember.create({
        data: {
          tenant_id: params.tenant.id,
          email,
          password: null,
          display_name:
            profile.display_name?.trim() || email.split("@")[0] || email,
          email_verified_at: new Date(),
          last_login_at: new Date(),
        },
      });
      isNew = true;
    }

    await prisma.siteMemberOAuthAccount.create({
      data: {
        tenant_id: params.tenant.id,
        member_id: member.id,
        provider: params.provider,
        provider_user_id: profile.provider_user_id,
        provider_email: email,
        provider_username: profile.username,
        avatar_url: profile.avatar_url,
      },
    });

    if (!isNew) {
      member = await prisma.siteMember.update({
        where: { id: member.id },
        data: {
          last_login_at: new Date(),
          failed_login_attempts: 0,
          locked_until: null,
          email_verified_at: member.email_verified_at ?? new Date(),
        },
      });
    }

    return {
      member: toSiteMemberProfile(member),
      tenant: params.tenant,
      is_new_member: isNew,
    };
  }

  static async createExchangeCode(params: {
    memberId: string;
    tenantId: string;
  }): Promise<string> {
    const code = randomBytes(32).toString("hex");
    await prisma.siteMemberOAuthExchangeCode.create({
      data: {
        code,
        tenant_id: params.tenantId,
        member_id: params.memberId,
        expires_at: new Date(Date.now() + EXCHANGE_CODE_TTL_MS),
      },
    });
    return code;
  }

  static async exchangeCode(params: {
    code: string;
    tenant: SiteTenant;
    jwtSign: JwtSign;
  }): Promise<{ member: SiteMemberProfile; tokens: AuthTokens }> {
    const trimmed = params.code.trim();
    if (!trimmed) {
      throw new ValidationError("site_member.oauth_exchange_invalid");
    }

    const row = await prisma.siteMemberOAuthExchangeCode.findUnique({
      where: { code: trimmed },
      include: { member: true },
    });
    if (
      !row ||
      row.consumed_at ||
      row.expires_at < new Date() ||
      row.tenant_id !== params.tenant.id ||
      row.member.tenant_id !== params.tenant.id
    ) {
      throw new ValidationError("site_member.oauth_exchange_invalid");
    }
    if (!row.member.enabled) {
      throw new UnauthorizedError("site_member.account_disabled");
    }

    await prisma.siteMemberOAuthExchangeCode.update({
      where: { id: row.id },
      data: { consumed_at: new Date() },
    });

    const tokens = generateTokens(row.member.id, params.tenant, params.jwtSign);
    await persistRefreshToken(row.member.id, tokens.refreshToken);

    return {
      member: toSiteMemberProfile(row.member),
      tokens,
    };
  }

  static async issueSessionCookiesDirect(params: {
    memberId: string;
    tenant: SiteTenant;
    jwtSign: JwtSign;
  }): Promise<{ member: SiteMemberProfile; tokens: AuthTokens }> {
    const member = await prisma.siteMember.findFirst({
      where: { id: params.memberId, tenant_id: params.tenant.id },
    });
    if (!member || !member.enabled) {
      throw new UnauthorizedError("site_member.account_disabled");
    }
    const tokens = generateTokens(member.id, params.tenant, params.jwtSign);
    await persistRefreshToken(member.id, tokens.refreshToken);
    return { member: toSiteMemberProfile(member), tokens };
  }
}

export { SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS } from "./site-member-auth.service.js";
