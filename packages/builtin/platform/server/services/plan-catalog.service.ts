/**
 * 套餐定价配置的读写（`AppSetting["plan_pricing"]`，平台级）。
 *
 * 读路径挂了一层**进程内缓存**：官网每渲染一次定价区就要读一次配置，而这份数据
 * 一天也改不了一次。写路径主动失效，所以缓存不会过期到看得见的程度。
 */

import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import {
  APP_SETTING_KEY_PLAN_PRICING,
  parsePlanPricingConfig,
  resolvePlanCatalog,
  type PlanPricingConfig,
  type ResolvedPlan,
} from "../../shared/plan-pricing.js";

import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

let cached: PlanPricingConfig | null = null;

export async function getPlanPricingConfig(): Promise<PlanPricingConfig> {
  if (cached) return cached;
  const row = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEY_PLAN_PRICING },
  });
  cached = parsePlanPricingConfig(row?.value ?? null);
  return cached;
}

/** 代码默认值 + 存储覆盖，已排好序。 */
export async function getPlanCatalog(): Promise<ResolvedPlan[]> {
  return resolvePlanCatalog(await getPlanPricingConfig());
}

export async function savePlanPricingConfig(
  raw: unknown,
): Promise<ResolvedPlan[]> {
  // 存之前先过一遍解析：脏字段进不了库，读路径也就不必反复防御
  const config = parsePlanPricingConfig(raw);
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_KEY_PLAN_PRICING },
    create: {
      key: APP_SETTING_KEY_PLAN_PRICING,
      value: config as unknown as Prisma.InputJsonValue,
    },
    update: { value: config as unknown as Prisma.InputJsonValue },
  });
  cached = config;
  return resolvePlanCatalog(config);
}

/** 仅供测试与热重载：丢掉缓存。 */
export function resetPlanPricingCache(): void {
  cached = null;
}
