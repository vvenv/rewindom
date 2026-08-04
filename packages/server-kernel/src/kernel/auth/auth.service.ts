import { randomUUID } from "node:crypto";

import { parseLoginIdentifier, type AuthActorType, type AuthTokens  } from "@be-water/shared";
import bcrypt from "bcrypt";

import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../lib/app-errors.js";
import { config } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";

import {
  buildPlatformAdminUser,
  findPlatformAdminByUsername,
  generatePlatformAdminTokens,
  verifyPlatformAdminPassword,
} from "./platform-admin.service.js";

import type { HostTenantContext } from "../../lib/host-tenant.js";

export const BCRYPT_SALT_ROUNDS = config.auth.bcryptSaltRounds;

export interface JwtSignPayload {
  userId: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  type: string;
  tenant_id?: string;
  tenant_slug?: string;
  jti?: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  userId: string;
  actor_type: AuthActorType;
  oldPassword: string;
  newPassword: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  static async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateTokens(
    userId: string,
    actorType: AuthActorType,
    isSystemAdmin: boolean,
    tenant_id: string,
    tenant_slug: string,
    jwtSign: (payload: JwtSignPayload) => string,
  ): AuthTokens {
    const accessToken = jwtSign({
      userId,
      actor_type: actorType,
      is_system_admin: isSystemAdmin,
      tenant_id,
      tenant_slug,
      type: "access",
    });

    const refreshToken = jwtSign({
      userId,
      actor_type: actorType,
      is_system_admin: isSystemAdmin,
      tenant_id,
      tenant_slug,
      type: "refresh",
      jti: randomUUID(),
    });

    return { accessToken, refreshToken };
  }

  static async login(
    input: LoginInput,
    jwtSign: (payload: JwtSignPayload) => string,
    options?: { hostTenant?: HostTenantContext | null },
  ): Promise<{
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
    tenant_slug: string | null;
  }> {
    const { username, password } = input;
    const hostTenant = options?.hostTenant ?? null;

    if (!username.includes("@") && !hostTenant) {
      const platformAdmin = await findPlatformAdminByUsername(username);
      if (platformAdmin) {
        if (!platformAdmin.enabled) {
          throw new UnauthorizedError("auth.account_disabled");
        }
        if (
          platformAdmin.locked_until &&
          platformAdmin.locked_until > new Date()
        ) {
          throw new UnauthorizedError("auth.account_locked_retry");
        }

        const valid = await verifyPlatformAdminPassword(
          password,
          platformAdmin.password,
        );
        if (!valid) {
          const failedAttempts = platformAdmin.failed_login_attempts + 1;
          const updateData: {
            failed_login_attempts: number;
            locked_until?: Date;
          } = { failed_login_attempts: failedAttempts };
          if (failedAttempts >= 5) {
            updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000);
          }
          await prisma.platformAdmin.update({
            where: { id: platformAdmin.id },
            data: updateData,
          });
          throw new UnauthorizedError("auth.invalid_credentials");
        }

        const now = new Date();
        const updated = await prisma.platformAdmin.update({
          where: { id: platformAdmin.id },
          data: {
            failed_login_attempts: 0,
            locked_until: null,
            last_login_at: now,
            last_access_at: now,
          },
        });

        const tokens = generatePlatformAdminTokens(
          platformAdmin.id,
          platformAdmin.is_system_admin,
          jwtSign,
        );

        const refreshTokenExpiry = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        );
        await prisma.platformAdminRefreshToken.create({
          data: {
            admin_id: platformAdmin.id,
            token: tokens.refreshToken,
            expires_at: refreshTokenExpiry,
          },
        });

        return {
          user: buildPlatformAdminUser(updated),
          tokens,
          tenant_slug: null,
        };
      }
    }

    let localUsername: string;
    let tenant_slug: string;

    if (hostTenant) {
      if (!username.includes("@")) {
        localUsername = username.trim();
        tenant_slug = hostTenant.tenant_slug;
      } else {
        const parsed = parseLoginIdentifier(username);
        if (parsed.tenant_slug !== hostTenant.tenant_slug) {
          throw new ValidationError("auth.tenant_host_mismatch");
        }
        localUsername = parsed.username;
        tenant_slug = hostTenant.tenant_slug;
      }
    } else {
      const parsed = parseLoginIdentifier(username);
      localUsername = parsed.username;
      tenant_slug = parsed.tenant_slug;
    }

    const tenant = hostTenant
      ? await prisma.tenant.findUnique({ where: { id: hostTenant.tenant_id } })
      : await prisma.tenant.findUnique({ where: { slug: tenant_slug } });
    if (!tenant || tenant.status !== "active") {
      throw new UnauthorizedError("auth.invalid_credentials");
    }

    const user = await prisma.user.findUnique({
      where: {
        tenant_id_username: {
          tenant_id: tenant.id,
          username: localUsername,
        },
      },
      omit: { tenant_id: true, password: true },
    });

    if (!user) {
      throw new UnauthorizedError("auth.invalid_credentials");
    }

    if (!user.enabled) {
      throw new UnauthorizedError("auth.account_disabled");
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    if (!fullUser) {
      throw new UnauthorizedError("auth.invalid_credentials");
    }

    if (fullUser.locked_until && fullUser.locked_until > new Date()) {
      throw new UnauthorizedError("auth.account_locked_retry");
    }

    if (!fullUser.password) {
      throw new UnauthorizedError("auth.invalid_credentials");
    }

    const isValidPassword = await this.verifyPassword(
      password,
      fullUser.password,
    );

    if (!isValidPassword) {
      const failedAttempts = fullUser.failed_login_attempts + 1;
      const updateData: {
        failed_login_attempts: number;
        locked_until?: Date;
      } = {
        failed_login_attempts: failedAttempts,
      };

      if (failedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 30 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedError("auth.invalid_credentials");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date(),
        last_access_at: new Date(),
      },
    });

    const tokens = this.generateTokens(
      user.id,
      "tenant_user",
      user.is_system_admin,
      tenant.id,
      tenant.slug,
      jwtSign,
    );

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: refreshTokenExpiry,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        actor_type: "tenant_user",
        is_system_admin: user.is_system_admin,
        enabled: user.enabled,
        created_at: user.created_at,
        updated_at: user.updated_at,
        last_login_at: user.last_login_at,
        last_access_at: user.last_access_at,
      },
      tokens,
      tenant_slug: tenant.slug,
    };
  }

  static async refresh(
    refreshToken: string,
    jwtSign: (payload: JwtSignPayload) => string,
    jwtVerify: (token: string) => JwtSignPayload,
  ): Promise<AuthTokens> {
    let decoded: JwtSignPayload;
    try {
      decoded = jwtVerify(refreshToken);
    } catch {
      throw new UnauthorizedError("auth.refresh_invalid");
    }

    if (decoded.type !== "refresh") {
      throw new UnauthorizedError("auth.token_invalid_type");
    }

    if (decoded.actor_type === "platform_admin") {
      const storedToken = await prisma.platformAdminRefreshToken.findUnique({
        where: { token: refreshToken },
        include: { admin: true },
      });

      if (!storedToken || storedToken.revoked) {
        throw new UnauthorizedError("auth.refresh_invalid");
      }
      if (storedToken.expires_at < new Date()) {
        await prisma.platformAdminRefreshToken.update({
          where: { id: storedToken.id },
          data: { revoked: true },
        });
        throw new UnauthorizedError("auth.refresh_expired");
      }
      if (!storedToken.admin.enabled) {
        throw new UnauthorizedError("auth.account_disabled");
      }

      const newTokens = generatePlatformAdminTokens(
        storedToken.admin.id,
        storedToken.admin.is_system_admin,
        jwtSign,
      );

      await prisma.platformAdminRefreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });

      const refreshTokenExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );
      await prisma.platformAdminRefreshToken.create({
        data: {
          admin_id: storedToken.admin.id,
          token: newTokens.refreshToken,
          expires_at: refreshTokenExpiry,
        },
      });

      return newTokens;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { tenant: true } } },
    });

    if (!storedToken || storedToken.revoked) {
      throw new UnauthorizedError("auth.refresh_invalid");
    }

    if (storedToken.expires_at < new Date()) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revoked: true },
      });
      throw new UnauthorizedError("auth.refresh_expired");
    }

    if (!storedToken.user.enabled) {
      throw new UnauthorizedError("auth.account_disabled");
    }

    const tenant_id = decoded.tenant_id ?? storedToken.user.tenant_id;
    const tenant_slug =
      decoded.tenant_slug ?? storedToken.user.tenant?.slug ?? "default";

    const newTokens = this.generateTokens(
      storedToken.user.id,
      "tenant_user",
      storedToken.user.is_system_admin,
      tenant_id,
      tenant_slug,
      jwtSign,
    );

    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        user_id: storedToken.user.id,
        token: newTokens.refreshToken,
        expires_at: refreshTokenExpiry,
      },
    });

    return newTokens;
  }

  static async logout(refreshToken: string): Promise<void> {
    await Promise.all([
      prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      }),
      prisma.platformAdminRefreshToken.updateMany({
        where: { token: refreshToken },
        data: { revoked: true },
      }),
    ]);
  }

  static async changePassword(input: ChangePasswordInput): Promise<void> {
    const { userId, actor_type, oldPassword, newPassword } = input;

    if (actor_type === "platform_admin") {
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: userId },
      });
      if (!admin) throw new NotFoundError("user.not_found");
      const valid = await this.verifyPassword(oldPassword, admin.password);
      if (!valid) throw new UnauthorizedError("auth.old_password_wrong");
      await prisma.platformAdmin.update({
        where: { id: userId },
        data: { password: await this.hashPassword(newPassword) },
      });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError("user.not_found");
    if (!user.password) {
      throw new UnauthorizedError("auth.password_not_set");
    }
    const valid = await this.verifyPassword(oldPassword, user.password);
    if (!valid) throw new UnauthorizedError("auth.old_password_wrong");
    await prisma.user.update({
      where: { id: userId },
      data: { password: await this.hashPassword(newPassword) },
    });
  }

  /**
   * OAuth 登录成功后签发双 Token，并更新 last_login_at。
   * 调用方须已完成身份校验与账号启用检查。
   */
  static async issueSessionForUser(
    userId: string,
    jwtSign: (payload: JwtSignPayload) => string,
  ): Promise<{
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
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user || !user.tenant) {
      throw new NotFoundError("user.not_found");
    }
    if (!user.enabled) {
      throw new UnauthorizedError("auth.account_disabled");
    }
    if (user.tenant.status !== "active") {
      throw new UnauthorizedError("auth.invalid_credentials");
    }

    const now = new Date();
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: now,
        last_access_at: now,
      },
    });

    const tokens = this.generateTokens(
      user.id,
      "tenant_user",
      user.is_system_admin,
      user.tenant_id,
      user.tenant.slug,
      jwtSign,
    );

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: tokens.refreshToken,
        expires_at: refreshTokenExpiry,
      },
    });

    return {
      user: {
        id: updated.id,
        username: updated.username,
        actor_type: "tenant_user",
        is_system_admin: updated.is_system_admin,
        enabled: updated.enabled,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
        last_login_at: updated.last_login_at,
        last_access_at: updated.last_access_at,
      },
      tokens,
      tenant_slug: user.tenant.slug,
    };
  }

  static async getUserById(
    userId: string,
    actorType: AuthActorType,
  ): Promise<{
    id: string;
    username: string;
    actor_type: AuthActorType;
    is_system_admin: boolean;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
    last_login_at: Date | null;
    last_access_at: Date | null;
  }> {
    if (actorType === "platform_admin") {
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          is_system_admin: true,
          enabled: true,
          created_at: true,
          updated_at: true,
          last_login_at: true,
          last_access_at: true,
        },
      });
      if (!admin) throw new NotFoundError("user.not_found");
      return { ...admin, actor_type: "platform_admin" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        is_system_admin: true,
        enabled: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        last_access_at: true,
      },
    });
    if (!user) throw new NotFoundError("user.not_found");
    return { ...user, actor_type: "tenant_user" };
  }

  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId },
      data: { revoked: true },
    });
  }

  static async revokeAllPlatformAdminTokens(adminId: string): Promise<void> {
    await prisma.platformAdminRefreshToken.updateMany({
      where: { admin_id: adminId },
      data: { revoked: true },
    });
  }
}
