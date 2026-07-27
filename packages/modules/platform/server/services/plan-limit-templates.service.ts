import { prisma } from "@be-water/server-kernel/lib/prisma.js";

import { APP_SETTING_KEY_PLAN_LIMIT_TEMPLATES, resolvePlanLimitTemplates, validatePlanLimitTemplates, type PlanLimitTemplateOverrides, type PlanLimitTemplates, type PlanSlug, type TenantLimitValues } from "../../shared/index.js";


import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

function normalizeOverrides(raw: unknown): PlanLimitTemplateOverrides {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return raw as PlanLimitTemplateOverrides;
}

export async function getPlanLimitTemplates(): Promise<PlanLimitTemplates> {
  const stored = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEY_PLAN_LIMIT_TEMPLATES },
  });

  return resolvePlanLimitTemplates(normalizeOverrides(stored?.value));
}

export async function resolvePlanLimitsForSlug(
  slug: PlanSlug,
): Promise<Partial<TenantLimitValues>> {
  const templates = await getPlanLimitTemplates();
  return templates[slug];
}

export async function savePlanLimitTemplates(
  input: unknown,
): Promise<PlanLimitTemplates> {
  const validated = validatePlanLimitTemplates(input);

  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_KEY_PLAN_LIMIT_TEMPLATES },
    create: {
      key: APP_SETTING_KEY_PLAN_LIMIT_TEMPLATES,
      value: validated as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: validated as unknown as Prisma.InputJsonValue,
    },
  });

  return validated;
}
