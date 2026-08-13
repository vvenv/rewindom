import { randomUUID } from "node:crypto";

import { PLATFORM_ADMIN_USER_ID, type AuthActorType, type AuthTokens  } from "@rewindom/shared";
import bcrypt from "bcrypt";

import { config } from "../../lib/config.js";
import { prisma } from "../../lib/prisma.js";

import { BCRYPT_SALT_ROUNDS } from "./auth.service.js";

interface JwtSignPayload {
  userId: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  type: string;
  tenant_id?: string;
  tenant_slug?: string;
  jti?: string;
}

export function isPlatformAdminConfigured(): boolean {
  const { username, password, passwordHash } = config.auth.platformAdmin;
  return Boolean(username && (password || passwordHash));
}

export function isPlatformAdminUsername(username: string): boolean {
  const trimmed = username.trim();
  if (!trimmed || trimmed.includes("@")) {
    return false;
  }
  return !trimmed.includes("@");
}

export async function ensureBootstrapPlatformAdmin(): Promise<void> {
  const { username, password, passwordHash } = config.auth.platformAdmin;
  if (!username) return;

  const existing = await prisma.platformAdmin.findUnique({
    where: { username },
  });
  if (existing) return;

  let hashed = passwordHash;
  if (!hashed && password) {
    hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }
  if (!hashed) return;

  await prisma.platformAdmin.create({
    data: {
      id: PLATFORM_ADMIN_USER_ID,
      username,
      password: hashed,
      is_system_admin: true,
      enabled: true,
    },
  });
}

export async function findPlatformAdminByUsername(
  username: string,
): Promise<{
  id: string;
  username: string;
  password: string;
  is_system_admin: boolean;
  enabled: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
} | null> {
  const trimmed = username.trim();
  if (!trimmed || trimmed.includes("@")) return null;
  return prisma.platformAdmin.findUnique({
    where: { username: trimmed },
  });
}

export async function verifyPlatformAdminPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generatePlatformAdminTokens(
  adminId: string,
  isSystemAdmin: boolean,
  jwtSign: (payload: JwtSignPayload) => string,
): AuthTokens {
  const accessToken = jwtSign({
    userId: adminId,
    actor_type: "platform_admin",
    is_system_admin: isSystemAdmin,
    type: "access",
  });
  const refreshToken = jwtSign({
    userId: adminId,
    actor_type: "platform_admin",
    is_system_admin: isSystemAdmin,
    type: "refresh",
    jti: randomUUID(),
  });
  return { accessToken, refreshToken };
}

export function buildPlatformAdminUser(admin: {
  id: string;
  username: string;
  is_system_admin: boolean;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  last_access_at: Date | null;
}): {
  id: string;
  username: string;
  actor_type: AuthActorType;
  is_system_admin: boolean;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
  last_access_at: Date | null;
} {
  return {
    id: admin.id,
    username: admin.username,
    actor_type: "platform_admin",
    is_system_admin: admin.is_system_admin,
    enabled: admin.enabled,
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    last_login_at: admin.last_login_at,
    last_access_at: admin.last_access_at,
  };
}
