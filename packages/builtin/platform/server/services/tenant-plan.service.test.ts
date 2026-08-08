import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("./tenant-json-setting.service.js", () => ({
  saveTenantJsonSetting: vi.fn(),
}));

vi.mock("./plan-limit-templates.service.js", () => ({
  resolvePlanLimitsForSlug: vi.fn().mockResolvedValue({
    max_stores: 5,
    max_users: 5,
  }),
}));

import { saveTenantJsonSetting } from "./tenant-json-setting.service.js";
import { updateTenantPlan } from "./tenant-management.service.js";

describe("updateTenantPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates plan and applies template settings", async () => {
    const now = new Date("2026-06-18T00:00:00.000Z");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-1",
      slug: "acme",
      name: "Acme",
      remark: null,
      status: "active",
      plan: "free",
      plan_since: now,
      plan_ends_at: null,
      onboarding_completed: false,
      created_at: now,
      updated_at: now,
    } as never);

    const updatedRow = {
      id: "tenant-1",
      slug: "acme",
      name: "Acme",
      remark: null,
      status: "active",
      plan: "pro",
      plan_since: new Date("2026-06-18T12:00:00.000Z"),
      plan_ends_at: null,
      onboarding_completed: false,
      created_at: now,
      updated_at: now,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        tenant: {
          update: vi.fn().mockResolvedValue(updatedRow),
        },
      } as never),
    );

    const result = await updateTenantPlan("tenant-1", { plan: "pro" });

    expect(result.plan).toBe("pro");
    expect(saveTenantJsonSetting).toHaveBeenCalledTimes(2);
  });

  it("updates plan expiry without reapplying template", async () => {
    const now = new Date("2026-06-18T00:00:00.000Z");
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
      id: "tenant-1",
      slug: "acme",
      name: "Acme",
      remark: null,
      status: "active",
      plan: "pro",
      plan_since: now,
      plan_ends_at: null,
      onboarding_completed: false,
      created_at: now,
      updated_at: now,
    } as never);

    const endsAt = new Date("2026-12-31T00:00:00.000Z");
    const updatedRow = {
      id: "tenant-1",
      slug: "acme",
      name: "Acme",
      remark: null,
      status: "active",
      plan: "pro",
      plan_since: now,
      plan_ends_at: endsAt,
      onboarding_completed: false,
      created_at: now,
      updated_at: now,
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        tenant: {
          update: vi.fn().mockResolvedValue(updatedRow),
        },
      } as never),
    );

    const result = await updateTenantPlan("tenant-1", {
      plan_ends_at: endsAt.toISOString(),
    });

    expect(result.plan_ends_at).toBe(endsAt.toISOString());
    expect(saveTenantJsonSetting).not.toHaveBeenCalled();
  });
});
