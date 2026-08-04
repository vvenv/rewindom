import {
  AuthService,
  type JwtSignPayload,
} from "@be-water/server-kernel/kernel/auth/auth.service.js";
import {
  AppError,
  ConflictError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { config as appConfig } from "@be-water/server-kernel/lib/config.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { emitDetachedAuditLogSafe } from "@be-water/server-kernel/runtime/audit-log-emit.js";
import { getServerPermissionCatalog } from "@be-water/server-kernel/runtime/permission-catalog.js";
import { getServerTenantCatalog } from "@be-water/server-kernel/runtime/tenant-catalog.js";
import {
  assertValidTenantSlug,
  DEFAULT_TENANT_ID,
  InvalidTenantSlugError,
  ReservedTenantSlugError,
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

import type { HostTenantContext } from "@be-water/server-kernel/lib/host-tenant.js";
import type {
  OAuthTenantRegistrationInput,
  RegistrationOptions,
} from "@be-water/server-kernel/runtime/provider-contracts.js";

export type { RegisterTenantInput };

export interface RegisterTenantResult {
  tenant_id: string;
  tenant_slug: string;
  user_id: string;
  username: string;
  tokens: AuthTokens;
}

async function resolveDefaultTenantForRegistration(): Promise<{
  id: string;
  slug: string;
  name: string;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: DEFAULT_TENANT_ID },
  });
  if (!tenant || tenant.status !== "active") {
    throw new AppError({ code: "tenant.default_unavailable", status: 503 });
  }
  return tenant;
}

async function resolveForcedTenantForRegistration(
  hostTenant: HostTenantContext,
): Promise<{ id: string; slug: string; name: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: hostTenant.tenant_id },
  });
  if (!tenant || tenant.status !== "active") {
    throw new AppError({ code: "tenant.suspended_or_missing", status: 403 });
  }
  return tenant;
}

/** OAuth / 强制租户注册时，在租户内为登录名找可用变体。 */
async function resolveUniqueUsernameInTenant(
  tenantId: string,
  baseUsername: string,
): Promise<string> {
  const normalized = baseUsername.trim();
  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate =
      attempt === 0 ? normalized : `${normalized.slice(0, 40)}-${attempt}`;
    try {
      validateUsername(candidate);
    } catch {
      continue;
    }
    const existing = await prisma.user.findUnique({
      where: {
        tenant_id_username: {
          tenant_id: tenantId,
          username: candidate,
        },
      },
    });
    if (!existing) {
      return candidate;
    }
  }
  return `${normalized.slice(0, 32)}-${Date.now().toString(36)}`;
}

async function issueRegistrationTokens(
  user: { id: string; username: string; is_system_admin: boolean },
  tenant: { id: string; slug: string },
  jwtSign: (payload: JwtSignPayload) => string,
): Promise<AuthTokens> {
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

  return tokens;
}

/**
 * 在指定租户内创建普通用户（非系统管理员）。
 * 用于 `SINGLE_TENANT` 默认租户，或自定义域名绑定租户。
 */
async function registerUserIntoTenant(
  tenant: { id: string; slug: string; name: string },
  input: {
    username: string;
    password?: string | null;
    phone?: string;
    email?: string | null;
    provider?: string;
    provider_user_id?: string;
    provider_username?: string;
    avatar_url?: string | null;
    /** OAuth 撞名时自动加后缀；密码注册则直接冲突。 */
    allowUsernameSuffix?: boolean;
  },
  jwtSign: (payload: JwtSignPayload) => string,
  ipAddress: string,
  userAgent: string,
): Promise<RegisterTenantResult> {
  validateUsername(input.username);

  let username = input.username.trim();

  const existingUser = await prisma.user.findUnique({
    where: {
      tenant_id_username: {
        tenant_id: tenant.id,
        username,
      },
    },
  });
  if (existingUser) {
    if (!input.allowUsernameSuffix) {
      throw new ConflictError("auth.username_exists");
    }
    username = await resolveUniqueUsernameInTenant(tenant.id, username);
  }

  if (input.provider && input.provider_user_id) {
    const existingLink = await prisma.oAuthAccount.findUnique({
      where: {
        provider_provider_user_id: {
          provider: input.provider,
          provider_user_id: input.provider_user_id,
        },
      },
    });
    if (existingLink) {
      throw new ConflictError("auth.oauth_already_linked");
    }
  }

  const hashedPassword =
    input.password != null && input.password.length > 0
      ? await AuthService.hashPassword(input.password)
      : null;

  const now = new Date();
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        username,
        password: hashedPassword,
        is_system_admin: false,
        last_login_at: input.provider ? now : undefined,
        last_access_at: input.provider ? now : undefined,
      },
    });

    if (input.provider && input.provider_user_id) {
      await tx.oAuthAccount.create({
        data: {
          provider: input.provider,
          provider_user_id: input.provider_user_id,
          user_id: createdUser.id,
          provider_username: input.provider_username ?? username,
          provider_email: input.email ?? null,
          avatar_url: input.avatar_url ?? null,
        },
      });
    }

    return createdUser;
  });

  await RoleService.ensureBuiltinTenantRoles(
    tenant.id,
    getServerPermissionCatalog(),
  );

  const tokens = await issueRegistrationTokens(user, tenant, jwtSign);

  try {
    await emitDetachedAuditLogSafe(undefined, {
      action: AuditAction.USER_CREATE,
      userId: user.id,
      username,
      ipAddress,
      userAgent,
      detail_key: "platform.audit.user_joined_default",
      detail_params: {
        tenant_slug: tenant.slug,
        tenant_name: tenant.name,
        phone: input.phone ?? "",
        email: input.email ?? "",
        provider: input.provider ?? "",
      },
      scope: "platform",
    });
  } catch (auditError) {
    console.error("记录单租户注册审计日志失败", auditError);
  }

  return {
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    user_id: user.id,
    username: user.username,
    tokens,
  };
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
  options?: RegistrationOptions,
): Promise<RegisterTenantResult> {
  const config = await getPlatformSettings();
  if (!config.registration_enabled) {
    throw new AppError({ code: "tenant.registration_disabled", status: 403 });
  }

  validateUsername(input.username);
  validatePhone(input.phone);
  validateEmail(input.email);
  validatePassword(input.password);

  const hostTenant = options?.hostTenant ?? null;
  if (hostTenant) {
    const tenant = await resolveForcedTenantForRegistration(hostTenant);
    return registerUserIntoTenant(
      tenant,
      {
        username: input.username,
        password: input.password,
        phone: input.phone,
        email: input.email,
      },
      jwtSign,
      ipAddress,
      userAgent,
    );
  }

  if (appConfig.tenant.singleTenant) {
    const tenant = await resolveDefaultTenantForRegistration();
    return registerUserIntoTenant(
      tenant,
      {
        username: input.username,
        password: input.password,
        phone: input.phone,
        email: input.email,
      },
      jwtSign,
      ipAddress,
      userAgent,
    );
  }

  validateTenantName(input.tenant_name ?? "");
  const slug = assertValidTenantSlug(input.tenant_slug ?? "");

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
        name: (input.tenant_name ?? "").trim(),
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

  const tokens = await issueRegistrationTokens(user, tenant, jwtSign);

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

async function resolveUniqueOAuthTenantSlug(baseUsername: string): Promise<string> {
  const normalized = baseUsername
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  let base = normalized.length >= 2 ? normalized : `gh-${normalized || "user"}`;
  if (base.length > 63) {
    base = base.slice(0, 63).replace(/-$/, "");
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const suffix = attempt === 0 ? "" : `-${attempt}`;
    const candidate = `${base.slice(0, Math.max(2, 63 - suffix.length))}${suffix}`
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    try {
      const slug = assertValidTenantSlug(candidate);
      const existing = await prisma.tenant.findUnique({ where: { slug } });
      if (!existing) {
        return slug;
      }
    } catch (error) {
      if (
        !(error instanceof InvalidTenantSlugError) &&
        !(error instanceof ReservedTenantSlugError)
      ) {
        throw error;
      }
    }
  }

  return assertValidTenantSlug(`gh-${Date.now().toString(36)}`);
}

/**
 * GitHub 等 OAuth 首次登录：创建个人租户 + 无密码管理员 + OAuthAccount，并签发双 Token。
 */
export async function registerOAuthTenant(
  input: OAuthTenantRegistrationInput,
  jwtSign: (payload: JwtSignPayload) => string,
  ipAddress: string,
  userAgent: string,
  options?: RegistrationOptions,
): Promise<RegisterTenantResult> {
  const settings = await getPlatformSettings();
  if (!settings.registration_enabled) {
    throw new AppError({ code: "auth.oauth_registration_disabled", status: 403 });
  }

  validateUsername(input.username);

  const hostTenant = options?.hostTenant ?? null;
  if (hostTenant) {
    const tenant = await resolveForcedTenantForRegistration(hostTenant);
    return registerUserIntoTenant(
      tenant,
      {
        username: input.username,
        password: null,
        email: input.email,
        provider: input.provider,
        provider_user_id: input.provider_user_id,
        provider_username: input.username,
        avatar_url: input.avatar_url,
        allowUsernameSuffix: true,
      },
      jwtSign,
      ipAddress,
      userAgent,
    );
  }

  if (appConfig.tenant.singleTenant) {
    const tenant = await resolveDefaultTenantForRegistration();
    return registerUserIntoTenant(
      tenant,
      {
        username: input.username,
        password: null,
        email: input.email,
        provider: input.provider,
        provider_user_id: input.provider_user_id,
        provider_username: input.username,
        avatar_url: input.avatar_url,
        allowUsernameSuffix: true,
      },
      jwtSign,
      ipAddress,
      userAgent,
    );
  }

  const existingLink = await prisma.oAuthAccount.findUnique({
    where: {
      provider_provider_user_id: {
        provider: input.provider,
        provider_user_id: input.provider_user_id,
      },
    },
  });
  if (existingLink) {
    throw new ConflictError("auth.oauth_already_linked");
  }

  const slug = await resolveUniqueOAuthTenantSlug(input.username);
  const tenantName = (
    input.display_name?.trim() ||
    input.username
  ).slice(0, 50);
  if (tenantName.length < 2) {
    throw new ValidationError("tenant.org_name_length");
  }

  const freePlan = PRICING_PLANS.free;
  const freePlanLimits = await resolvePlanLimitsForSlug("free");
  const now = new Date();

  const { tenant, user } = await prisma.$transaction(async (tx) => {
    const createdTenant = await tx.tenant.create({
      data: {
        slug,
        name: tenantName,
        plan: "free",
        plan_since: now,
        status: settings.require_tenant_approval ? "pending" : "active",
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
        password: null,
        is_system_admin: true,
        last_login_at: now,
        last_access_at: now,
      },
    });

    await tx.oAuthAccount.create({
      data: {
        provider: input.provider,
        provider_user_id: input.provider_user_id,
        user_id: createdUser.id,
        provider_username: input.username,
        provider_email: input.email,
        avatar_url: input.avatar_url,
      },
    });

    return { tenant: createdTenant, user: createdUser };
  });

  await RoleService.ensureBuiltinTenantRoles(
    tenant.id,
    getServerPermissionCatalog(),
  );

  const tokens = await issueRegistrationTokens(user, tenant, jwtSign);

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
        provider: input.provider,
        email: input.email ?? "",
        phone: "",
      },
      scope: "platform",
    });
  } catch (auditError) {
    console.error("记录 OAuth 注册审计日志失败", auditError);
  }

  return {
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    user_id: user.id,
    username: user.username,
    tokens,
  };
}
