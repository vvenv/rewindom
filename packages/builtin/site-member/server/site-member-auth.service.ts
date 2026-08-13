import { randomBytes, randomUUID } from "node:crypto";

import {
  AuthService,
  type JwtSignPayload,
} from "@rewindom/server-kernel/kernel/auth/auth.service.js";
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { type AuthTokens } from "@rewindom/shared";

import { toSiteMemberProfile } from "./site-member.mapper.js";

import type { SiteTenant } from "./site-member-tenant.js";
import type {
  SiteMemberChangePasswordBody,
  SiteMemberLoginBody,
  SiteMemberProfile,
  SiteMemberRegisterBody,
  SiteMemberUpdateProfileBody,
} from "../shared/site-member.js";

/** 与工作台会话保持一致：refresh 7 天，access 15 分钟。 */
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SITE_MEMBER_ACCESS_TOKEN_TTL_SECONDS = 900;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 30 * 60 * 1000;

type JwtSign = (payload: JwtSignPayload) => string;
type JwtVerify = <T>(token: string) => T;

export interface SiteMemberSessionResult {
  member: SiteMemberProfile;
  tokens: AuthTokens;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmail(email: string): void {
  const trimmed = normalizeEmail(email);
  if (!trimmed) {
    throw new ValidationError("site_member.email_required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new ValidationError("site_member.email_invalid");
  }
}

/**
 * 会员是终端消费者，密码规则比工作台账号宽松一档（不强制大小写混合），
 * 但仍要求 8 位以上，避免撞库。
 */
function validatePassword(password: string): void {
  if (!password) {
    throw new ValidationError("site_member.password_required");
  }
  if (password.length < 8) {
    throw new ValidationError("site_member.password_min_8");
  }
}

function generateTokens(
  memberId: string,
  tenant: SiteTenant,
  jwtSign: JwtSign,
): AuthTokens {
  const base = {
    userId: memberId,
    actor_type: "site_member",
    // 会员永远不是任何域的系统管理员；写死避免被 JWT 伪造放大。
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

export class SiteMemberAuthService {
  static async register(
    input: SiteMemberRegisterBody,
    tenant: SiteTenant,
    jwtSign: JwtSign,
  ): Promise<SiteMemberSessionResult> {
    validateEmail(input.email);
    validatePassword(input.password);

    const email = normalizeEmail(input.email);
    const existing = await prisma.siteMember.findUnique({
      where: { tenant_id_email: { tenant_id: tenant.id, email } },
    });
    if (existing) {
      throw new ConflictError("site_member.email_exists");
    }

    const member = await prisma.siteMember.create({
      data: {
        tenant_id: tenant.id,
        email,
        password: await AuthService.hashPassword(input.password),
        display_name: input.display_name?.trim() || email.split("@")[0]!,
        last_login_at: new Date(),
      },
    });

    const tokens = generateTokens(member.id, tenant, jwtSign);
    await persistRefreshToken(member.id, tokens.refreshToken);

    return { member: toSiteMemberProfile(member), tokens };
  }

  static async login(
    input: SiteMemberLoginBody,
    tenant: SiteTenant,
    jwtSign: JwtSign,
  ): Promise<SiteMemberSessionResult> {
    if (!input.email || !input.password) {
      throw new ValidationError("site_member.credentials_required");
    }

    const member = await prisma.siteMember.findUnique({
      where: {
        tenant_id_email: {
          tenant_id: tenant.id,
          email: normalizeEmail(input.email),
        },
      },
    });

    // 不区分「不存在」与「密码错」，避免暴露哪些邮箱注册过本站。
    if (!member) {
      throw new UnauthorizedError("site_member.invalid_credentials");
    }
    if (!member.enabled) {
      throw new UnauthorizedError("site_member.account_disabled");
    }
    if (member.locked_until && member.locked_until > new Date()) {
      throw new UnauthorizedError("site_member.account_locked_retry");
    }
    if (!member.password) {
      throw new UnauthorizedError("site_member.invalid_credentials");
    }

    const valid = await AuthService.verifyPassword(
      input.password,
      member.password,
    );
    if (!valid) {
      const failedAttempts = member.failed_login_attempts + 1;
      await prisma.siteMember.update({
        where: { id: member.id, tenant_id: tenant.id },
        data: {
          failed_login_attempts: failedAttempts,
          locked_until:
            failedAttempts >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_MS)
              : undefined,
        },
      });
      throw new UnauthorizedError("site_member.invalid_credentials");
    }

    const updated = await prisma.siteMember.update({
      where: { id: member.id, tenant_id: tenant.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
      },
    });

    const tokens = generateTokens(member.id, tenant, jwtSign);
    await persistRefreshToken(member.id, tokens.refreshToken);

    return { member: toSiteMemberProfile(updated), tokens };
  }

  static async refresh(
    refreshToken: string,
    jwtSign: JwtSign,
    jwtVerify: JwtVerify,
  ): Promise<AuthTokens> {
    let decoded: JwtSignPayload;
    try {
      decoded = jwtVerify<JwtSignPayload>(refreshToken);
    } catch {
      throw new UnauthorizedError("site_member.token_invalid_or_expired");
    }

    if (decoded.type !== "refresh" || decoded.actor_type !== "site_member") {
      throw new UnauthorizedError("site_member.token_invalid_type");
    }
    if (!decoded.tenant_id || !decoded.tenant_slug) {
      throw new UnauthorizedError("site_member.token_invalid_or_expired");
    }

    const stored = await prisma.siteMemberRefreshToken.findUnique({
      where: { token: refreshToken },
      include: { member: true },
    });
    if (!stored || stored.revoked || stored.expires_at < new Date()) {
      throw new UnauthorizedError("site_member.token_invalid_or_expired");
    }
    if (!stored.member.enabled) {
      throw new UnauthorizedError("site_member.account_disabled");
    }
    // token 里的租户必须与会员实际归属一致，防止绑定域换绑后旧 token 继续可用。
    if (stored.member.tenant_id !== decoded.tenant_id) {
      throw new UnauthorizedError("site_member.token_invalid_or_expired");
    }

    const tokens = generateTokens(
      stored.member.id,
      { id: decoded.tenant_id, slug: decoded.tenant_slug },
      jwtSign,
    );

    await prisma.$transaction([
      prisma.siteMemberRefreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      }),
      prisma.siteMemberRefreshToken.create({
        data: {
          member_id: stored.member.id,
          token: tokens.refreshToken,
          expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
      }),
    ]);

    return tokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.siteMemberRefreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
  }

  static async getProfile(
    memberId: string,
    tenantId: string,
  ): Promise<SiteMemberProfile> {
    const member = await prisma.siteMember.findFirst({
      where: { id: memberId, tenant_id: tenantId },
    });
    if (!member || !member.enabled) {
      throw new UnauthorizedError("site_member.invalid_credentials");
    }
    return toSiteMemberProfile(member);
  }

  static async updateProfile(
    memberId: string,
    tenantId: string,
    input: SiteMemberUpdateProfileBody,
  ): Promise<SiteMemberProfile> {
    const displayName = input.display_name?.trim();
    if (displayName !== undefined && displayName.length === 0) {
      throw new ValidationError("site_member.display_name_required");
    }
    if (displayName !== undefined && displayName.length > 50) {
      throw new ValidationError("site_member.display_name_too_long");
    }

    const member = await prisma.siteMember.update({
      where: { id: memberId, tenant_id: tenantId },
      data: { display_name: displayName },
    });
    return toSiteMemberProfile(member);
  }

  static async changePassword(
    memberId: string,
    tenantId: string,
    input: SiteMemberChangePasswordBody,
  ): Promise<void> {
    validatePassword(input.new_password);

    const member = await prisma.siteMember.findFirst({
      where: { id: memberId, tenant_id: tenantId },
    });
    if (!member) {
      throw new UnauthorizedError("site_member.invalid_credentials");
    }
    if (!member.password) {
      throw new ValidationError("site_member.password_not_set");
    }

    const valid = await AuthService.verifyPassword(
      input.old_password ?? "",
      member.password,
    );
    if (!valid) {
      throw new UnauthorizedError("site_member.old_password_incorrect");
    }

    await prisma.$transaction([
      prisma.siteMember.update({
        where: { id: memberId, tenant_id: tenantId },
        data: { password: await AuthService.hashPassword(input.new_password) },
      }),
      // 改密即踢掉其它设备的会话。
      prisma.siteMemberRefreshToken.updateMany({
        where: { member_id: memberId, revoked: false },
        data: { revoked: true },
      }),
    ]);
  }

  /** 运营者代重置：会员无法自助找回（仓库暂无邮件能力），只能由站点管理员给出一次性密码。 */
  static async resetPassword(
    memberId: string,
    tenantId: string,
  ): Promise<string> {
    const password = randomBytes(9).toString("base64url");

    await prisma.$transaction([
      prisma.siteMember.update({
        where: { id: memberId, tenant_id: tenantId },
        data: {
          password: await AuthService.hashPassword(password),
          failed_login_attempts: 0,
          locked_until: null,
        },
      }),
      prisma.siteMemberRefreshToken.updateMany({
        where: { member_id: memberId, revoked: false },
        data: { revoked: true },
      }),
    ]);

    return password;
  }
}
