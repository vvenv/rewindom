import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createDefaultTenantFeatureFlags } from "../../shared/index.js";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("./tenant-json-setting.service.js", () => ({
  getTenantJsonSetting: vi.fn(),
}));

vi.mock("./tenant-limit.service.js", () => ({
  getTenantLimitUsage: vi.fn(),
  resolveTenantLimit: vi.fn(),
}));

vi.mock("./tenant-feature.service.js", () => ({
  getTenantFeatureFlags: vi.fn(),
}));

import { getTenantFeatureFlags } from "./tenant-feature.service.js";
import {
  getTenantLimitUsage,
  resolveTenantLimit,
} from "./tenant-limit.service.js";
import { getTenantUsage } from "./usage.service.js";

const sampleFeatureCatalog = {
  features: [
    {
      key: "advanced_analysis",
      label: "高级分析",
      description: "",
      disabled_hint: "",
      default_enabled: false,
    },
    {
      key: "custom_reports",
      label: "自定义报告",
      description: "",
      disabled_hint: "",
      default_enabled: false,
    },
    {
      key: "chat",
      label: "对话",
      description: "",
      disabled_hint: "",
      default_enabled: true,
    },
  ],
} as const;

describe("usage.service", () => {
  const TENANT_ID = "t-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: TENANT_ID,
      plan: "starter",
    } as never);
    vi.mocked(getTenantFeatureFlags).mockResolvedValue(
      createDefaultTenantFeatureFlags(sampleFeatureCatalog),
    );
    vi.mocked(getTenantLimitUsage).mockImplementation(async () => 0);
    vi.mocked(resolveTenantLimit).mockImplementation(async () => null);
  });

  it("租户不存在时抛出错误", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce(null);

    await expect(getTenantUsage(TENANT_ID)).rejects.toThrow("组织不存在");
  });

  it("返回正确的套餐信息", async () => {
    const result = await getTenantUsage(TENANT_ID);

    expect(result.plan.slug).toBe("starter");
    expect(typeof result.plan.price_cents).toBe("number");
  });

  it("返回用量限制信息", async () => {
    vi.mocked(getTenantLimitUsage).mockResolvedValueOnce(1);
    vi.mocked(resolveTenantLimit).mockResolvedValueOnce(3);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.limits.max_users).toEqual({
      used: 1,
      limit: 3,
      percentage: expect.closeTo(100 / 3, 5),
    });
  });

  it("limit 为 null 时 percentage 为 0", async () => {
    vi.mocked(resolveTenantLimit).mockResolvedValue(null);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.limits.max_users.percentage).toBe(0);
    expect(result.limits.max_users.limit).toBeNull();
  });

  it("used 超过 limit 时 percentage 上限为 100", async () => {
    vi.mocked(getTenantLimitUsage).mockResolvedValue(15);
    vi.mocked(resolveTenantLimit).mockResolvedValue(10);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.limits.max_users.percentage).toBe(100);
  });

  it("功能开关从 tenant feature service 读取", async () => {
    vi.mocked(getTenantFeatureFlags).mockResolvedValueOnce({
      ...createDefaultTenantFeatureFlags(sampleFeatureCatalog),
      advanced_analysis: true,
      custom_reports: true,
    });

    const result = await getTenantUsage(TENANT_ID);

    expect(result.features.advanced_analysis).toBe(true);
    expect(result.features.custom_reports).toBe(true);
  });

  it("can_upgrade_to 根据 plan 返回升级路径", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      plan: "free",
    } as never);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.can_upgrade_to).toContain("starter");
    expect(result.can_upgrade_to).toContain("pro");
    expect(result.can_upgrade_to).toContain("business");
    expect(result.can_upgrade_to).toContain("enterprise");
  });

  it("ultimate 套餐无可升级路径", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      plan: "ultimate",
    } as never);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.can_upgrade_to).toHaveLength(0);
  });

  it("show_usage_card 根据 plan 决定是否显示", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      plan: "pro",
    } as never);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.show_usage_card).toBe(true);
  });

  it("upgrade_url 固定为 /settings/upgrade", async () => {
    const result = await getTenantUsage(TENANT_ID);

    expect(result.upgrade_url).toBe("/settings/upgrade");
  });

  it("plan 为空时回退到 free", async () => {
    vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
      plan: null,
    } as never);

    const result = await getTenantUsage(TENANT_ID);

    expect(result.plan.slug).toBe("free");
  });

  it("各套餐的 can_upgrade_to 正确", async () => {
    const cases: Array<{ plan: string; expected: string[] }> = [
      { plan: "free", expected: ["starter", "pro", "business", "enterprise"] },
      { plan: "starter", expected: ["pro", "business", "enterprise"] },
      { plan: "pro", expected: ["business", "enterprise"] },
      { plan: "business", expected: ["enterprise"] },
      { plan: "enterprise", expected: [] },
      { plan: "ultimate", expected: [] },
    ];

    for (const { plan, expected } of cases) {
      vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
        plan,
      } as never);

      const result = await getTenantUsage(TENANT_ID);
      expect(result.can_upgrade_to).toEqual(expected);
    }
  });
});
