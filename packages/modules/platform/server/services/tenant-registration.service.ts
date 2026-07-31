import {
  AuthService,
  type JwtSignPayload,
} from "@be-water/server-kernel/kernel/auth/auth.service.js";
import {
  AppError,
  ConflictError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { emitDetachedAuditLogSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { getServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";
import { getServerTenantCatalog } from "@be-water/server-kernel/runtime/tenant-catalog.js";
import {
  assertValidTenantSlug,
  type AuthTokens,
  type RegisterTenantInput,
} from "@be-water/shared";

import { AuditAction } from "../../../audit/shared/index.js";
import { RoleService } from "../../../rbac/server/role.service.js";
import {
  PRICING_PLANS,
  TENANT_FEATURES_STORAGE_KEY,
  TENANT_LIMITS_STORAGE_KEY,
  TENANT_MODULES_STORAGE_KEY,
  createDefaultTenantModuleFlags,
} from "../../shared/index.js";

import { resolvePlanLimitsForSlug } from "./plan-limit-templates.service.js";
import { getPlatformSettings } from "./platform-settings.service.js";
import { saveTenantJsonSetting } from "./tenant-json-setting.service.js";

export type { RegisterTenantInput };

export interface RegisterTenantResult {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  username: string;
  tokens: AuthTokens;
}

function validateUsername(username: string): void {
  if (!username || username.trim().length === 0) {
    throw new ValidationError("auth.username_required");
  }
  if (username.length < 3 || username.length > 50) {
    throw new ValidationError("auth.username_length");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    throw new ValidationError("auth.username_charset");
  }
}

function validatePassword(password: string): void {
  if (!password || password.length === 0) {
    throw new ValidationError("auth.password_required");
  }
  if (password.length < 8) {
    throw new ValidationError("auth.password_min_8");
  }
  if (!/[a-z]/.test(password)) {
    throw new ValidationError("auth.password_need_lower");
  }
  if (!/[A-Z]/.test(password)) {
    throw new ValidationError("auth.password_need_upper");
  }
  if (!/[0-9]/.test(password)) {
    throw new ValidationError("auth.password_need_digit");
  }
}

function validatePhone(phone: string): void {
  if (!phone || phone.trim().length === 0) {
    throw new ValidationError("auth.phone_required");
  }
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone.trim())) {
    throw new ValidationError("auth.phone_invalid");
  }
}

function validateEmail(email: string): void {
  if (!email || email.trim().length === 0) {
    throw new ValidationError("auth.email_required");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new ValidationError("auth.email_invalid");
  }
}

function validateTenantName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new ValidationError("tenant.org_name_required");
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 50) {
    throw new ValidationError("tenant.org_name_length");
  }
}

export async function registerTenant(
  input: RegisterTenantInput,
  jwtSign: (payload: JwtSignPayload) => string,
  ipAddress: string,
  userAgent: string,
): Promise<RegisterTenantResult> {
  const config = await getPlatformSettings();
  if (!config.registration_enabled) {
    throw new AppError({ code: "tenant.registration_disabled", status: 403 });
  }

  validateTenantName(input.tenant_name);
  validateUsername(input.username);
  validatePhone(input.phone);
  validateEmail(input.email);
  validatePassword(input.password);

  const slug = assertValidTenantSlug(input.tenant_slug);

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new ConflictError("tenant.slug_exists");
  }

  const hashedPassword = await AuthService.hashPassword(input.password);

  const freePlan = PRICING_PLANS.free;
  const freePlanLimits = await resolvePlanLimitsForSlug("free");
  const now = new Date();

  const { tenant, user } = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        slug,
        name: input.tenant_name.trim(),
        plan: "free",
        plan_since: now,
        status: config.require_tenant_approval ? "pending" : "active",
      },
    });

    await saveTenantJsonSetting(
      createdTenant.id,
      TENANT_FEATURES_STORAGE_KEY,
      freePlan.features,
      tx,
    );
    await saveTenantJsonSetting(
      createdTenant.id,
      TENANT_MODULES_STORAGE_KEY,
      createDefaultTenantModuleFlags(getServerTenantCatalog().modules),
      tx,
    );
    await saveTenantJsonSetting(
      createdTenant.id,
      TENANT_LIMITS_STORAGE_KEY,
      freePlanLimits,
      tx,
    );

    const createdUser = await tx.user.create({
      data: {
        tenant_id: createdTenant.id,
        username: input.username.trim(),
        password: hashedPassword,
        is_system_admin: true,
      },
    });

    return { tenant: createdTenant, user: createdUser };
  });

  await RoleService.ensureBuiltinTenantRoles(
    tenant.id,
    getServerPermissionCatalog(),
  );

  const tokens = AuthService.generateTokens(
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

  try {
    await emitDetachedAuditLogSafe(undefined, {
      action: AuditAction.TENANT_REGISTER,
      userId: user.id,
      username: input.username,
      ipAddress,
      userAgent,
      detail_key: "platform.audit.tenant_registered",
      detail_params: {
        tenant_slug: tenant.slug,
        tenant_name: tenant.name,
        phone: input.phone,
        email: input.email,
      },
      scope: "platform",
    });
  } catch (auditError) {
    console.error("记录注册审计日志失败", auditError);
  }

  return {
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    user_id: user.id,
    username: user.username,
    tokens,
  };
}
