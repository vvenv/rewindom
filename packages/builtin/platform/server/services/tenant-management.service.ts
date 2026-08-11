
import { AuthService, type JwtSignPayload } from "@be-water/server-kernel/kernel/auth/auth.service.js";
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@be-water/server-kernel/lib/app-errors.js";
import { config as appConfig } from "@be-water/server-kernel/lib/config.js";
import {
  invalidateHostTenantCache,
  normalizeCustomDomain,
} from "@be-water/server-kernel/lib/host-tenant.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { emitDetachedDomainEventSafe } from "@be-water/server-kernel/runtime/domain-event-emit.js";
import { formatLoginIdentifier, generateRandomPassword, assertValidTenantSlug  } from "@be-water/shared";

import { isValidPlanSlug, PRICING_PLANS, TENANT_FEATURES_STORAGE_KEY, TENANT_INITIAL_ADMIN_USERNAME, TENANT_LIMITS_STORAGE_KEY, type CreateTenantBody, type ImpersonateTenantResult, type PatchTenantBody, type PlanSlug, type PlatformUserSummary, type TenantAdminCredentials, type TenantCreated, type TenantIntegrationStatus, type TenantStats, type TenantSummary, type TenantStatus, type UpdateTenantPlanBody } from "../../shared/index.js";

import {
  ensureTenantImpersonationUser,
  excludeInternalUsersWhere,
} from "./ensure-tenant-impersonation-user.service.js";
import { resolvePlanLimitsForSlug } from "./plan-limit-templates.service.js";
import { getPlatformSettings } from "./platform-settings.service.js";
import { saveTenantJsonSetting } from "./tenant-json-setting.service.js";
import { startOfLocalDay, startOfLocalMonth } from "./tenant-limit.service.js";
import { countTenantMetric } from "./tenant-metrics.registry.js";

/** Impersonation refresh tokens expire sooner than normal login. */
const IMPERSONATION_REFRESH_TOKEN_MS = 4 * 60 * 60 * 1000;

function toTenantSummary(row: {
  id: string;
  slug: string;
  name: string;
  remark: string | null;
  custom_domain: string | null;
  status: string;
  plan: string;
  plan_since: Date | null;
  plan_ends_at: Date | null;
  created_at: Date;
  updated_at: Date;
}): TenantSummary {
  const plan = (isValidPlanSlug(row.plan) ? row.plan : "free") as PlanSlug;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    remark: row.remark,
    custom_domain: row.custom_domain,
    status: row.status as TenantStatus,
    plan,
    plan_since: row.plan_since?.toISOString() ?? null,
    plan_ends_at: row.plan_ends_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}

function parsePlanEndsAt(
  value: string | null | undefined,
): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || value.trim() === "") {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError("tenant.plan_ends_at_invalid");
  }
  return parsed;
}

function normalizeRemark(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listTenants(
  options: { include_archived?: boolean } = {},
): Promise<TenantSummary[]> {
  const rows = await prisma.tenant.findMany({
    where: options.include_archived
      ? undefined
      : { status: { not: "archived" } },
    orderBy: { created_at: "asc" },
  });
  return rows.map(toTenantSummary);
}

function toTenantAdminCredentials(
  tenantSlug: string,
  password: string,
): TenantAdminCredentials {
  return {
    username: TENANT_INITIAL_ADMIN_USERNAME,
    password,
    login_identifier: formatLoginIdentifier(
      TENANT_INITIAL_ADMIN_USERNAME,
      tenantSlug,
    ),
  };
}

export async function createTenant(
  input: CreateTenantBody,
): Promise<TenantCreated> {
  if (appConfig.tenant.singleTenant) {
    throw new AppError({ code: "tenant.single_tenant_mode", status: 403 });
  }

  const slug = assertValidTenantSlug(input.slug);
  const name = input.name.trim();
  if (!name) {
    throw new ValidationError("tenant.name_required");
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new ConflictError("tenant.slug_exists");
  }

  const plainPassword = generateRandomPassword();
  const hashedPassword = await AuthService.hashPassword(plainPassword);

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        slug,
        name,
        remark: normalizeRemark(input.remark),
        status: "active",
      },
    });

    await tx.user.create({
      data: {
        tenant_id: created.id,
        username: TENANT_INITIAL_ADMIN_USERNAME,
        password: hashedPassword,
        is_system_admin: true,
      },
    });

    await ensureTenantImpersonationUser(created.id, tx);

    return created;
  });

  // 新租户的 `{slug}.{base}` 之前解析为「无租户」，那个否定结果可能还在缓存里
  invalidateHostTenantCache();

  // 事件是尽力而为的广播：locale 反查失败也不该让已建成的租户报错回去
  try {
    const { default_locale } = await getPlatformSettings();
    await emitDetachedDomainEventSafe(undefined, "tenant.created", {
      tenant_id: tenant.id,
      default_locale,
    });
  } catch {
    /* noop */
  }

  return {
    ...toTenantSummary(tenant),
    admin: toTenantAdminCredentials(slug, plainPassword),
  };
}

export async function resetTenantAdminPassword(
  tenantId: string,
  newPassword?: string,
): Promise<TenantAdminCredentials> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError("tenant.not_found");
  }

  const adminUser = await prisma.user.findUnique({
    where: {
      tenant_id_username: {
        tenant_id: tenantId,
        username: TENANT_INITIAL_ADMIN_USERNAME,
      },
    },
  });

  const password = newPassword?.trim() || generateRandomPassword();
  if (password.length < 6) {
    throw new ValidationError("auth.password_min_6");
  }

  const hashedPassword = await AuthService.hashPassword(password);

  if (!adminUser) {
    await prisma.user.create({
      data: {
        tenant_id: tenantId,
        username: TENANT_INITIAL_ADMIN_USERNAME,
        password: hashedPassword,
        is_system_admin: true,
      },
    });

    return {
      ...toTenantAdminCredentials(tenant.slug, password),
      recreated: true,
    };
  }

  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      password: hashedPassword,
      is_system_admin: true,
      enabled: true,
      failed_login_attempts: 0,
      locked_until: null,
    },
  });
  await AuthService.revokeAllUserTokens(adminUser.id);

  return {
    ...toTenantAdminCredentials(tenant.slug, password),
    recreated: false,
  };
}

export async function getTenantById(id: string): Promise<TenantSummary | null> {
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  return tenant ? toTenantSummary(tenant) : null;
}

export async function patchTenant(
  id: string,
  patch: PatchTenantBody,
): Promise<TenantSummary> {
  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("tenant.not_found");
  }

  const data: {
    slug?: string;
    name?: string;
    remark?: string | null;
    status?: string;
    custom_domain?: string | null;
  } = {};

  if (patch.slug !== undefined) {
    const slug = assertValidTenantSlug(patch.slug);
    if (slug !== existing.slug) {
      if (existing.slug === "default") {
        throw new ValidationError("tenant.default_slug_immutable");
      }
      const conflict = await prisma.tenant.findFirst({
        where: { slug, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictError("tenant.slug_exists");
      }
      data.slug = slug;
    }
  }

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) {
      throw new ValidationError("tenant.name_required");
    }
    data.name = name;
  }
  if (patch.remark !== undefined) {
    data.remark = normalizeRemark(patch.remark);
  }
  if (patch.status !== undefined) {
    if (
      patch.status !== "active" &&
      patch.status !== "suspended" &&
      patch.status !== "archived"
    ) {
      throw new ValidationError("tenant.status_invalid");
    }
    if (
      existing.slug === "default" &&
      (patch.status === "suspended" || patch.status === "archived")
    ) {
      throw new ValidationError("tenant.default_not_suspendable_or_archivable");
    }
    data.status = patch.status;
  }
  if (patch.custom_domain !== undefined) {
    const domain = normalizeCustomDomain(patch.custom_domain);
    if (domain !== existing.custom_domain) {
      if (domain) {
        const conflict = await prisma.tenant.findFirst({
          where: { custom_domain: domain, NOT: { id } },
        });
        if (conflict) {
          throw new ConflictError("tenant.domain_exists");
        }
      }
      data.custom_domain = domain;
    }
  }

  if (Object.keys(data).length === 0) {
    return toTenantSummary(existing);
  }

  const tenant =
    data.slug !== undefined
      ? await prisma.$transaction(async (tx) => {
          const updated = await tx.tenant.update({
            where: { id },
            data,
          });
          await tx.auditLog.updateMany({
            where: { tenant_slug: existing.slug },
            data: { tenant_slug: data.slug },
          });
          await tx.errorLog.updateMany({
            where: { tenant_slug: existing.slug },
            data: { tenant_slug: data.slug },
          });
          return updated;
        })
      : await prisma.tenant.update({
          where: { id },
          data,
        });

  // slug / custom_domain / status 任何一个变了，Host → 租户的映射就变了。
  // 不清缓存的话最长 30 秒内旧绑定仍然生效：新绑的域名 404、刚归档的租户还进得去。
  invalidateHostTenantCache();

  return toTenantSummary(tenant);
}

export async function getTenantStats(id: string): Promise<TenantStats | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tenant) {
    return null;
  }

  // 业务实体计数由业务模块登记（见 tenant-metrics.registry）；未启用则为 0。
  const ctx = { dayStart: startOfLocalDay(), monthStart: startOfLocalMonth() };
  const [document_count, product_count, analysis_count, user_count] =
    await Promise.all([
      countTenantMetric("stats_documents", id, ctx),
      countTenantMetric("stats_products", id, ctx),
      countTenantMetric("stats_analyses", id, ctx),
      prisma.user.count({
        where: { tenant_id: id, ...excludeInternalUsersWhere },
      }),
    ]);

  return {
    document_count,
    product_count,
    analysis_count,
    user_count,
  };
}

export async function archiveTenant(id: string): Promise<TenantSummary> {
  return patchTenant(id, { status: "archived" });
}

export async function getTenantIntegrationStatus(
  tenantId: string,
): Promise<TenantIntegrationStatus | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true },
  });
  if (!tenant) {
    return null;
  }

  const openaiSetting = await prisma.tenantSetting.findUnique({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: "openai_api_key" },
    },
    select: { secret: true, updated_at: true },
  });

  return {
    openai_api: {
      configured: Boolean(openaiSetting?.secret?.trim()),
      updated_at: openaiSetting?.updated_at?.toISOString() ?? null,
    },
  };
}

const PLATFORM_USER_SORTABLE_FIELDS = new Set([
  "tenant_slug",
  "username",
  "is_system_admin",
  "enabled",
  "last_login_at",
  "created_at",
]);

function buildPlatformUsersOrderBy(
  sortBy?: string,
  sortDir: "asc" | "desc" = "asc",
): Array<
  | { tenant: { slug: "asc" | "desc" } }
  | { username: "asc" | "desc" }
  | { is_system_admin: "asc" | "desc" }
  | { enabled: "asc" | "desc" }
  | { last_login_at: "asc" | "desc" }
  | { created_at: "asc" | "desc" }
> {
  if (!sortBy || !PLATFORM_USER_SORTABLE_FIELDS.has(sortBy)) {
    return [{ tenant: { slug: "asc" } }, { username: "asc" }];
  }

  if (sortBy === "tenant_slug") {
    return [{ tenant: { slug: sortDir } }, { username: "asc" }];
  }

  return [{ [sortBy]: sortDir } as
    | { username: "asc" | "desc" }
    | { is_system_admin: "asc" | "desc" }
    | { enabled: "asc" | "desc" }
    | { last_login_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" }];
}

export async function listPlatformUsers(filters: {
  tenant_slug?: string;
  search?: string;
  skip?: number;
  take?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<{ items: PlatformUserSummary[]; total: number }> {
  const { tenant_slug, search, skip = 0, take = 20, sort_by, sort_dir } =
    filters;

  const tenantWhere = tenant_slug
    ? { slug: tenant_slug.trim().toLowerCase() }
    : { status: { not: "archived" as const } };

  const userWhere = search?.trim()
    ? {
        OR: [
          {
            username: { contains: search.trim(), mode: "insensitive" as const },
          },
        ],
      }
    : undefined;

  const where = {
    ...excludeInternalUsersWhere,
    tenant: tenantWhere,
    ...(userWhere ?? {}),
  };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        tenant: { select: { id: true, slug: true, name: true } },
      },
      orderBy: buildPlatformUsersOrderBy(sort_by, sort_dir),
      skip,
      take,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      username: row.username,
      is_system_admin: row.is_system_admin,
      enabled: row.enabled,
      tenant_id: row.tenant.id,
      tenant_slug: row.tenant.slug,
      tenant_name: row.tenant.name,
      created_at: row.created_at.toISOString(),
      last_login_at: row.last_login_at?.toISOString() ?? null,
    })),
    total,
  };
}

export async function listTenantUsers(
  tenantId: string,
): Promise<Array<{ id: string; username: string; is_system_admin: boolean }>> {
  const users = await prisma.user.findMany({
    where: {
      tenant_id: tenantId,
      ...excludeInternalUsersWhere,
    },
    select: { id: true, username: true, is_system_admin: true },
    orderBy: [{ created_at: "asc" }, { username: "asc" }],
  });
  return users;
}

export async function impersonateTenantAdmin(
  tenantId: string,
  jwtSign: (payload: JwtSignPayload) => string,
  userId?: string,
): Promise<ImpersonateTenantResult> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError("tenant.not_found");
  }
  if (tenant.status !== "active") {
    throw new ValidationError("tenant.impersonate_active_only");
  }

  const targetUserId =
    userId ?? (await ensureTenantImpersonationUser(tenantId)).id;

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser || targetUser.tenant_id !== tenantId) {
    throw new NotFoundError("tenant.impersonate_user_missing");
  }
  if (!targetUser.enabled) {
    throw new ValidationError("tenant.impersonate_user_disabled");
  }

  const tokens = AuthService.generateTokens(
    targetUser.id,
    "tenant_user",
    targetUser.is_system_admin,
    tenant.id,
    tenant.slug,
    jwtSign,
  );

  const refreshTokenExpiry = new Date(
    Date.now() + IMPERSONATION_REFRESH_TOKEN_MS,
  );
  await prisma.refreshToken.create({
    data: {
      user_id: targetUser.id,
      token: tokens.refreshToken,
      expires_at: refreshTokenExpiry,
    },
  });

  const { password: _password, ...userWithoutPassword } = targetUser;

  return {
    user: {
      id: userWithoutPassword.id,
      username: userWithoutPassword.username,
      actor_type: "tenant_user" as const,
      is_system_admin: userWithoutPassword.is_system_admin,
      enabled: userWithoutPassword.enabled,
      created_at: userWithoutPassword.created_at.toISOString(),
      updated_at: userWithoutPassword.updated_at.toISOString(),
      last_login_at: userWithoutPassword.last_login_at?.toISOString() ?? null,
    },
    tokens,
    tenant_slug: tenant.slug,
    tenant_name: tenant.name,
    login_identifier: formatLoginIdentifier(targetUser.username, tenant.slug),
  };
}

export async function updateTenantPlan(
  id: string,
  body: UpdateTenantPlanBody,
): Promise<TenantSummary> {
  if (body.plan === undefined && body.plan_ends_at === undefined) {
    throw new ValidationError("tenant.plan_fields_required");
  }

  const existing = await prisma.tenant.findUnique({ where: { id } });
  if (!existing) {
    throw new NotFoundError("tenant.not_found");
  }

  const nextPlan =
    body.plan !== undefined ? body.plan : (existing.plan as PlanSlug);
  if (!isValidPlanSlug(nextPlan)) {
    throw new ValidationError("plan.invalid");
  }

  const parsedPlanEndsAt = parsePlanEndsAt(body.plan_ends_at);
  const planChanged = body.plan !== undefined && body.plan !== existing.plan;
  const now = new Date();
  const planDefinition = PRICING_PLANS[nextPlan];
  const planLimits = planChanged
    ? await resolvePlanLimitsForSlug(nextPlan)
    : null;

  const updated = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.update({
      where: { id },
      data: {
        ...(planChanged
          ? {
              plan: nextPlan,
              plan_since: now,
            }
          : {}),
        ...(parsedPlanEndsAt !== undefined
          ? { plan_ends_at: parsedPlanEndsAt }
          : {}),
      },
    });

    if (planChanged && planLimits) {
      await saveTenantJsonSetting(
        id,
        TENANT_FEATURES_STORAGE_KEY,
        planDefinition.features,
        tx,
      );
      await saveTenantJsonSetting(
        id,
        TENANT_LIMITS_STORAGE_KEY,
        planLimits,
        tx,
      );
    }

    return tenant;
  });

  return toTenantSummary(updated);
}
