import { randomBytes, randomInt } from "node:crypto";

import { type AuthActorType, type AuthTokens } from "@rewindom/shared";
import bcrypt from "bcrypt";
import { Secret, TOTP } from "otpauth";
import QRCode from "qrcode";

import { Prisma } from "../../generated/prisma/client/client.js";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "../../lib/app-errors.js";
import { prisma } from "../../lib/prisma.js";
import {
  decryptTenantSecret,
  encryptTenantSecret,
} from "../../lib/tenant-secret-crypto.js";

import {
  AuthService,
  BCRYPT_SALT_ROUNDS,
  type JwtSignPayload,
} from "./auth.service.js";
import {
  refreshTokenExpiryDate,
  TWO_FACTOR_CHALLENGE_TTL_SECONDS,
} from "./jwt.js";
import {
  buildPlatformAdminUser,
  generatePlatformAdminTokens,
} from "./platform-admin.service.js";

export { TWO_FACTOR_CHALLENGE_TTL_SECONDS };

const RECOVERY_CODE_COUNT = 10;
const ISSUER = "Rewindom";

export interface TwoFactorChallengePayload {
  userId: string;
  actor_type: "tenant_user" | "platform_admin";
  type: "2fa_challenge";
  is_system_admin: boolean;
  tenant_id?: string;
  tenant_slug?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
}

function normalizeTotpCode(code: string): string {
  return code.replace(/\s+/g, "").trim();
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODE_COUNT; i += 1) {
    const left = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const right = randomInt(0, 1_000_000).toString().padStart(6, "0");
    codes.push(`${left}-${right}`);
  }
  return codes;
}

async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(
    codes.map((code) => bcrypt.hash(code, BCRYPT_SALT_ROUNDS)),
  );
}

function parseRecoveryHashes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function buildTotp(secretBase32: string, label: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export class TwoFactorService {
  static async getStatus(
    userId: string,
    actorType: AuthActorType,
  ): Promise<TwoFactorStatus> {
    const row = await this.loadRow(userId, actorType);
    if (!row) throw new NotFoundError("user.not_found");
    return {
      enabled: row.totp_enabled,
      pending: Boolean(row.totp_secret_encrypted) && !row.totp_enabled,
    };
  }

  static async startSetup(
    userId: string,
    actorType: AuthActorType,
    username: string,
  ): Promise<{
    otpauth_url: string;
    qr_data_url: string;
    secret: string;
    recovery_codes: string[];
  }> {
    const row = await this.loadRow(userId, actorType);
    if (!row) throw new NotFoundError("user.not_found");
    if (row.totp_enabled) {
      throw new ValidationError("auth.2fa_already_enabled");
    }

    const secret = new Secret({ size: 20 });
    const secretBase32 = secret.base32;
    const totp = buildTotp(secretBase32, username);
    const otpauthUrl = totp.toString();
    const recoveryCodes = generateRecoveryCodes();
    const recoveryHashes = await hashRecoveryCodes(recoveryCodes);

    await this.writeRow(userId, actorType, {
      totp_secret_encrypted: encryptTenantSecret(secretBase32),
      totp_enabled: false,
      totp_recovery_codes: recoveryHashes,
    });

    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    });

    return {
      otpauth_url: otpauthUrl,
      qr_data_url: qrDataUrl,
      secret: secretBase32,
      recovery_codes: recoveryCodes,
    };
  }

  static async confirmSetup(
    userId: string,
    actorType: AuthActorType,
    code: string,
  ): Promise<void> {
    const row = await this.loadRow(userId, actorType);
    if (!row?.totp_secret_encrypted) {
      throw new ValidationError("auth.2fa_setup_required");
    }
    if (row.totp_enabled) {
      throw new ValidationError("auth.2fa_already_enabled");
    }

    const secret = decryptTenantSecret(row.totp_secret_encrypted);
    if (!this.verifyTotp(secret, code)) {
      throw new UnauthorizedError("auth.2fa_code_invalid");
    }

    await this.writeRow(userId, actorType, { totp_enabled: true });
  }

  static async disable(
    userId: string,
    actorType: AuthActorType,
    code: string,
  ): Promise<void> {
    const row = await this.loadRow(userId, actorType);
    if (!row?.totp_enabled || !row.totp_secret_encrypted) {
      throw new ValidationError("auth.2fa_not_enabled");
    }

    const secret = decryptTenantSecret(row.totp_secret_encrypted);
    const recoveryHashes = parseRecoveryHashes(row.totp_recovery_codes);
    const totpOk = this.verifyTotp(secret, code);
    let recoveryOk = false;
    if (!totpOk) {
      const matched = await this.consumeRecoveryCode(recoveryHashes, code);
      recoveryOk = matched.ok;
    }
    if (!totpOk && !recoveryOk) {
      throw new UnauthorizedError("auth.2fa_code_invalid");
    }

    await this.writeRow(userId, actorType, {
      totp_secret_encrypted: null,
      totp_enabled: false,
      totp_recovery_codes: Prisma.DbNull,
    });
  }

  static async isEnabled(
    userId: string,
    actorType: AuthActorType,
  ): Promise<boolean> {
    const row = await this.loadRow(userId, actorType);
    return Boolean(row?.totp_enabled && row.totp_secret_encrypted);
  }

  static createChallengeToken(
    payload: Omit<TwoFactorChallengePayload, "type">,
    jwtSign: (payload: JwtSignPayload) => string,
  ): string {
    return jwtSign({
      userId: payload.userId,
      actor_type: payload.actor_type,
      is_system_admin: payload.is_system_admin,
      tenant_id: payload.tenant_id,
      tenant_slug: payload.tenant_slug,
      type: "2fa_challenge",
      jti: randomBytes(8).toString("hex"),
    });
  }

  static verifyChallengeToken(
    token: string,
    jwtVerify: (token: string) => JwtSignPayload,
  ): TwoFactorChallengePayload {
    let decoded: JwtSignPayload;
    try {
      decoded = jwtVerify(token);
    } catch {
      throw new UnauthorizedError("auth.2fa_challenge_invalid");
    }
    if (decoded.type !== "2fa_challenge") {
      throw new UnauthorizedError("auth.2fa_challenge_invalid");
    }
    if (
      decoded.actor_type !== "tenant_user" &&
      decoded.actor_type !== "platform_admin"
    ) {
      throw new UnauthorizedError("auth.2fa_challenge_invalid");
    }
    return {
      userId: decoded.userId,
      actor_type: decoded.actor_type,
      type: "2fa_challenge",
      is_system_admin: decoded.is_system_admin,
      tenant_id: decoded.tenant_id,
      tenant_slug: decoded.tenant_slug,
    };
  }

  static async verifyAndIssueSession(
    challengeToken: string,
    code: string,
    jwtSign: (payload: JwtSignPayload) => string,
    jwtVerify: (token: string) => JwtSignPayload,
  ): Promise<{
    user: Awaited<ReturnType<typeof AuthService.getUserById>>;
    tokens: AuthTokens;
    tenant_slug: string | null;
  }> {
    const challenge = this.verifyChallengeToken(challengeToken, jwtVerify);
    const row = await this.loadRow(challenge.userId, challenge.actor_type);
    if (!row?.totp_enabled || !row.totp_secret_encrypted) {
      throw new ValidationError("auth.2fa_not_enabled");
    }

    const secret = decryptTenantSecret(row.totp_secret_encrypted);
    const recoveryHashes = parseRecoveryHashes(row.totp_recovery_codes);
    const totpOk = this.verifyTotp(secret, code);
    if (!totpOk) {
      const matched = await this.consumeRecoveryCode(recoveryHashes, code);
      if (!matched.ok) {
        throw new UnauthorizedError("auth.2fa_code_invalid");
      }
      await this.writeRow(challenge.userId, challenge.actor_type, {
        totp_recovery_codes: matched.remaining,
      });
    }

    if (challenge.actor_type === "platform_admin") {
      const admin = await prisma.platformAdmin.findUnique({
        where: { id: challenge.userId },
      });
      if (!admin || !admin.enabled) {
        throw new UnauthorizedError("auth.account_disabled");
      }
      const tokens = generatePlatformAdminTokens(
        admin.id,
        admin.is_system_admin,
        jwtSign,
      );
      await prisma.platformAdminRefreshToken.create({
        data: {
          admin_id: admin.id,
          token: tokens.refreshToken,
          expires_at: refreshTokenExpiryDate(),
        },
      });
      return {
        user: buildPlatformAdminUser(admin),
        tokens,
        tenant_slug: null,
      };
    }

    const session = await AuthService.issueSessionForUser(
      challenge.userId,
      jwtSign,
    );
    return {
      user: session.user,
      tokens: session.tokens,
      tenant_slug: session.tenant_slug,
    };
  }

  static verifyTotp(secretBase32: string, code: string): boolean {
    const totp = buildTotp(secretBase32, "verify");
    const delta = totp.validate({
      token: normalizeTotpCode(code),
      window: 1,
    });
    return delta !== null;
  }

  private static async consumeRecoveryCode(
    hashes: string[],
    code: string,
  ): Promise<{ ok: boolean; remaining: string[] }> {
    const normalized = normalizeTotpCode(code);
    for (let i = 0; i < hashes.length; i += 1) {
      const hash = hashes[i]!;
      if (await bcrypt.compare(normalized, hash)) {
        return {
          ok: true,
          remaining: [...hashes.slice(0, i), ...hashes.slice(i + 1)],
        };
      }
    }
    return { ok: false, remaining: hashes };
  }

  private static async loadRow(
    userId: string,
    actorType: AuthActorType,
  ): Promise<{
    totp_secret_encrypted: string | null;
    totp_enabled: boolean;
    totp_recovery_codes: unknown;
  } | null> {
    if (actorType === "tenant_user") {
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          totp_secret_encrypted: true,
          totp_enabled: true,
          totp_recovery_codes: true,
        },
      });
    }
    if (actorType === "platform_admin") {
      return prisma.platformAdmin.findUnique({
        where: { id: userId },
        select: {
          totp_secret_encrypted: true,
          totp_enabled: true,
          totp_recovery_codes: true,
        },
      });
    }
    return null;
  }

  private static async writeRow(
    userId: string,
    actorType: AuthActorType,
    data: {
      totp_secret_encrypted?: string | null;
      totp_enabled?: boolean;
      totp_recovery_codes?: Prisma.InputJsonValue | typeof Prisma.DbNull;
    },
  ): Promise<void> {
    if (actorType === "tenant_user") {
      await prisma.user.update({ where: { id: userId }, data });
      return;
    }
    if (actorType === "platform_admin") {
      await prisma.platformAdmin.update({ where: { id: userId }, data });
    }
  }
}
