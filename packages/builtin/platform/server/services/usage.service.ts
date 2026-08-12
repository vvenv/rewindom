import { NotFoundError } from "@be-water/server-kernel/lib/app-errors.js";
import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { shouldShowUsageCard, type PlanSlug, type TenantLimitKey, PRICING_PLANS, type UsageStats  } from "../../shared/index.js";


import { getTenantFeatureFlags } from "./tenant-feature.service.js";
import {
  getTenantLimitUsage,
  resolveTenantLimit,
} from "./tenant-limit.service.js";

function calculateUsage(used: number, limit: number | null) {
  if (limit === null) {
    return { used, limit: null, percentage: 0 };
  }
  const percentage = limit > 0 ? (used / limit) * 100 : 100;
  return { used, limit, percentage: Math.min(percentage, 100) };
}

function getUpgradePaths(currentPlan: PlanSlug): PlanSlug[] {
  if (currentPlan === "ultimate" || currentPlan === "enterprise") {
    return [];
  }
  const paths: PlanSlug[] = [];
  if (currentPlan === "free") {
    paths.push("starter", "pro", "business", "enterprise");
  } else if (currentPlan === "starter") {
    paths.push("pro", "business", "enterprise");
  } else if (currentPlan === "pro") {
    paths.push("business", "enterprise");
  } else if (currentPlan === "business") {
    paths.push("enterprise");
  }
  return paths;
}

async function resolveUsageItem(
  tenantId: string,
  usageKey: TenantLimitKey,
  limitKey: TenantLimitKey = usageKey,
): Promise<ReturnType<typeof calculateUsage>> {
  const [used, limit] = await Promise.all([
    getTenantLimitUsage(tenantId, usageKey),
    resolveTenantLimit(tenantId, limitKey),
  ]);
  return calculateUsage(used, limit);
}

export async function getTenantUsage(tenantId: string): Promise<UsageStats> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new NotFoundError("tenant.not_found");
  }

  const planSlug = (tenant.plan || "free") as PlanSlug;
  const plan = PRICING_PLANS[planSlug];

  const features = await getTenantFeatureFlags(tenantId);

  const [maxUsers] = await Promise.all([
    resolveUsageItem(tenantId, "max_users"),
  ]);

  return {
    plan: {
      slug: planSlug,
      price_monthly: plan.price_monthly,
    },
    limits: {
      max_users: maxUsers,
    },
    features,
    can_upgrade_to: getUpgradePaths(planSlug),
    upgrade_url: "/settings/upgrade",
    show_usage_card: shouldShowUsageCard(planSlug),
  };
}
