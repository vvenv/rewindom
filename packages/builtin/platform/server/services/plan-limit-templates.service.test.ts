import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultPlanLimitTemplates } from "../../shared/index.js";

vi.unmock("./plan-limit-templates.service.js");

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    appSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import {
  getPlanLimitTemplates,
  resolvePlanLimitsForSlug,
  savePlanLimitTemplates,
} from "./plan-limit-templates.service.js";

const defaults = getDefaultPlanLimitTemplates();

describe("plan-limit-templates.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getPlanLimitTemplates returns code defaults when no stored config", async () => {
    vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(null);

    const templates = await getPlanLimitTemplates();

    expect(templates.free.max_users).toBe(defaults.free.max_users);
    expect(templates.pro.max_users).toBe(defaults.pro.max_users);
  });

  it("getPlanLimitTemplates merges stored overrides", async () => {
    vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
      key: "plan_limit_templates",
      value: { free: { max_users: 20 } },
    } as never);

    const templates = await getPlanLimitTemplates();

    expect(templates.free.max_users).toBe(20);
    expect(templates.pro.max_users).toBe(defaults.pro.max_users);
  });

  it("resolvePlanLimitsForSlug returns limits for a plan", async () => {
    vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(null);

    const limits = await resolvePlanLimitsForSlug("pro");

    expect(limits.max_users).toBe(defaults.pro.max_users);
  });

  it("savePlanLimitTemplates validates and persists config", async () => {
    vi.mocked(prisma.appSetting.upsert).mockResolvedValue({} as never);

    const saved = await savePlanLimitTemplates({
      free: { max_users: 20 },
    });

    expect(saved.free.max_users).toBe(20);
    expect(prisma.appSetting.upsert).toHaveBeenCalled();
  });
});
