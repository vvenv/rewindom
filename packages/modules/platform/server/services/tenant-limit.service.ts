import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { NotFoundError } from "@be-water/server-kernel/lib/app-errors.js";

import { formatLimitExceededMessage, isValidPlanSlug, TENANT_LIMITS_STORAGE_KEY, type PlanSlug, type TenantLimitKey, type TenantLimitValues } from "../../shared/index.js";
import { LimitExceededError } from "../lib/limit-exceeded.error.js";

import { excludeInternalUsersWhere } from "./ensure-tenant-impersonation-user.service.js";
import { resolvePlanLimitsForSlug } from "./plan-limit-templates.service.js";
import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";
import {
  countTenantMetric,
  registerTenantMetricCounter,
} from "./tenant-metrics.registry.js";

type StoredTenantLimits = Partial<TenantLimitValues>;

function normalizeStoredLimits(
  raw: StoredTenantLimits | null | undefined,
): StoredTenantLimits {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw;
}

export function startOfLocalDay(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function startOfLocalMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function resolveLimit(
  stored: StoredTenantLimits,
  key: TenantLimitKey,
  planLimits: Partial<TenantLimitValues>,
): number | null {
  return stored[key] ?? planLimits[key] ?? null;
}

async function getTenantPlanContext(tenantId: string): Promise<{
  planLimits: Partial<TenantLimitValues>;
  storedLimits: StoredTenantLimits;
}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!tenant) {
    throw new NotFoundError("tenant.not_found");
  }

  const planSlug = (
    isValidPlanSlug(tenant.plan) ? tenant.plan : "free"
  ) as PlanSlug;
  const [planLimits, storedLimits] = await Promise.all([
    resolvePlanLimitsForSlug(planSlug),
    getTenantJsonSetting<StoredTenantLimits>(
      tenantId,
      TENANT_LIMITS_STORAGE_KEY,
      normalizeStoredLimits,
      {},
    ),
  ]);

  return {
    planLimits,
    storedLimits,
  };
}

export async function resolveTenantLimit(
  tenantId: string,
  key: TenantLimitKey,
): Promise<number | null> {
  const { planLimits, storedLimits } = await getTenantPlanContext(tenantId);
  return resolveLimit(storedLimits, key, planLimits);
}

/** `max_users` 数的是内核 `User`，属基础设施，内置于此。 */
registerTenantMetricCounter("max_users", (tenantId) =>
  prisma.user.count({
    where: { tenant_id: tenantId, ...excludeInternalUsersWhere },
  }),
);

export async function getTenantLimitUsage(
  tenantId: string,
  key: TenantLimitKey,
): Promise<number> {
  return countTenantMetric(key, tenantId, {
    dayStart: startOfLocalDay(),
    monthStart: startOfLocalMonth(),
  });
}

export async function assertTenantLimitNotExceeded(
  tenantId: string,
  key: TenantLimitKey,
  options: { additional?: number } = {},
): Promise<void> {
  const limit = await resolveTenantLimit(tenantId, key);
  if (limit === null) {
    return;
  }

  const additional = options.additional ?? 0;
  const used = await getTenantLimitUsage(tenantId, key);
  if (used + additional > limit) {
    throw new LimitExceededError(
      key,
      limit,
      formatLimitExceededMessage(key, limit),
    );
  }
}

export async function assertTenantLimitCountAllowed(
  tenantId: string,
  key: TenantLimitKey,
  count: number,
): Promise<void> {
  const limit = await resolveTenantLimit(tenantId, key);
  if (limit === null) {
    return;
  }
  if (count > limit) {
    throw new LimitExceededError(
      key,
      limit,
      formatLimitExceededMessage(key, limit),
    );
  }
}

export async function saveTenantLimits(
  tenantId: string,
  limits: StoredTenantLimits,
): Promise<StoredTenantLimits> {
  await saveTenantJsonSetting(
    tenantId,
    TENANT_LIMITS_STORAGE_KEY,
    normalizeStoredLimits(limits),
  );
  return normalizeStoredLimits(limits);
}

export async function getTenantLimits(
  tenantId: string,
): Promise<StoredTenantLimits> {
  return getTenantJsonSetting<StoredTenantLimits>(
    tenantId,
    TENANT_LIMITS_STORAGE_KEY,
    normalizeStoredLimits,
    {},
  );
}
