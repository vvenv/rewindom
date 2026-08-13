import { getDefaultPlanLimitTemplates } from "@rewindom/builtin/platform/shared/index.js";
import { vi } from "vitest";

const DEFAULT_PLAN_LIMITS_BY_SLUG = getDefaultPlanLimitTemplates();

vi.mock("../modules/platform/services/plan-limit-templates.service.js", () => ({
  getPlanLimitTemplates: vi.fn(async () => ({
    ...DEFAULT_PLAN_LIMITS_BY_SLUG,
  })),
  resolvePlanLimitsForSlug: vi.fn(
    async (slug: keyof typeof DEFAULT_PLAN_LIMITS_BY_SLUG) =>
      DEFAULT_PLAN_LIMITS_BY_SLUG[slug] ?? DEFAULT_PLAN_LIMITS_BY_SLUG.free,
  ),
  savePlanLimitTemplates: vi.fn(async (input: unknown) => input),
}));
