import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDefaultPlanLimitTemplates } from "../../shared/index.js";
import {
  registerTenantMetricCounter,
  resetTenantMetricCounters,
} from "./tenant-metrics.registry.js";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    document: {
      count: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    analysis: {
      count: vi.fn(),
    },
  },
}));

vi.mock("./tenant-json-setting.service.js", () => ({
  getTenantJsonSetting: vi.fn(),
  saveTenantJsonSetting: vi.fn(),
}));

vi.mock("./plan-limit-templates.service.js", () => ({
  resolvePlanLimitsForSlug: vi.fn(),
}));

import { LimitExceededError } from "../lib/limit-exceeded.error.js";

import { resolvePlanLimitsForSlug } from "./plan-limit-templates.service.js";
import { getTenantJsonSetting } from "./tenant-json-setting.service.js";
import {
  assertTenantLimitCountAllowed,
  assertTenantLimitNotExceeded,
  resolveTenantLimit,
} from "./tenant-limit.service.js";

const planDefaults = getDefaultPlanLimitTemplates();

describe("tenant-limit.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockTenantPlan(
    plan: string,
    storedLimits: Record<string, number> = {},
  ) {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ plan } as never);
    vi.mocked(getTenantJsonSetting).mockResolvedValue(storedLimits);
    vi.mocked(resolvePlanLimitsForSlug).mockImplementation(
      async (slug) =>
        planDefaults[slug as keyof typeof planDefaults] ?? planDefaults.free,
    );
  }

  it("resolveTenantLimit uses plan default when no stored override", async () => {
    mockTenantPlan("free");

    const limit = await resolveTenantLimit("tenant-1", "max_users");

    expect(limit).toBe(planDefaults.free.max_users);
  });

  it("resolveTenantLimit prefers stored override over plan default", async () => {
    mockTenantPlan("free", { max_users: 100 });

    const limit = await resolveTenantLimit("tenant-1", "max_users");

    expect(limit).toBe(100);
  });

  it("resolveTenantLimit returns null for ultimate plan (unlimited)", async () => {
    mockTenantPlan("ultimate");

    const limit = await resolveTenantLimit("tenant-1", "max_users");

    expect(limit).toBeNull();
  });

  it("assertTenantLimitNotExceeded skips when limit is null", async () => {
    mockTenantPlan("ultimate");
    registerTenantMetricCounter("max_users", async () => 999);

    await expect(
      assertTenantLimitNotExceeded("tenant-1", "max_users", {
        additional: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it("assertTenantLimitNotExceeded throws LimitExceededError when exceeded", async () => {
    mockTenantPlan("free");
    // 上游不内置业务实体计数器（业务配额由各模块自行登记），
    // 此处登记一个桩来验证「超限即抛」这条编排契约。
    registerTenantMetricCounter("max_users", async () =>
      planDefaults.free.max_users ?? 0,
    );

    await expect(
      assertTenantLimitNotExceeded("tenant-1", "max_users", {
        additional: 1,
      }),
    ).rejects.toBeInstanceOf(LimitExceededError);
  });

  it("未登记计数器的配额键用量为 0（对应业务模块未启用）", async () => {
    mockTenantPlan("free");
    resetTenantMetricCounters();

    await expect(
      assertTenantLimitNotExceeded("tenant-1", "max_users", {
        additional: 1,
      }),
    ).resolves.toBeUndefined();
  });

  it("assertTenantLimitCountAllowed throws when count exceeds limit", async () => {
    mockTenantPlan("free");

    await expect(
      assertTenantLimitCountAllowed("tenant-1", "max_users", 999),
    ).rejects.toMatchObject({
      limitKey: "max_users",
      limit: planDefaults.free.max_users,
    });
  });
});
