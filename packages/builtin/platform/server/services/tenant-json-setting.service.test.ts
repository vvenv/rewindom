import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@rewindom/server-kernel/lib/prisma.js", () => ({
  prisma: {
    tenantSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    appSetting: {
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@rewindom/shared", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    DEFAULT_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  };
});

import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

describe("getTenantJsonSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tenantSetting 存在时应返回 normalize 后的值", async () => {
    const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue({
      value: { theme: "dark" },
    } as never);

    const result = await getTenantJsonSetting(
      "tenant-1",
      "ui_config",
      (raw) => ({ theme: (raw as { theme?: string })?.theme ?? "light" }),
      { theme: "light" },
    );

    expect(result).toEqual({ theme: "dark" });
  });

  it("DEFAULT_TENANT_ID 时 tenantSetting 不存在也返回 defaultValue(不再回退 appSetting)", async () => {
    const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue(null);

    const result = await getTenantJsonSetting(
      DEFAULT_TENANT_ID,
      "ui_config",
      (raw) => ({ theme: (raw as { theme?: string })?.theme ?? "light" }),
      { theme: "light" },
    );

    // 实现已统一到 tenantSetting:默认租户也走 tenantSetting,不再回退 appSetting
    expect(result).toEqual({ theme: "light" });
    expect(prisma.appSetting.findUnique).not.toHaveBeenCalled();
  });

  it("两者都不存在时应返回 defaultValue 的 normalize 结果", async () => {
    const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(null);

    const result = await getTenantJsonSetting(
      DEFAULT_TENANT_ID,
      "ui_config",
      (raw) => ({ theme: (raw as { theme?: string })?.theme ?? "light" }),
      { theme: "light" },
    );

    expect(result).toEqual({ theme: "light" });
  });

  it("非 DEFAULT_TENANT_ID 不存在时直接返回 defaultValue 的 normalize 结果", async () => {
    const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue(null);

    const result = await getTenantJsonSetting(
      "other-tenant",
      "ui_config",
      (raw) => ({ theme: (raw as { theme?: string })?.theme ?? "light" }),
      { theme: "light" },
    );

    expect(result).toEqual({ theme: "light" });
    expect(prisma.appSetting.findUnique).not.toHaveBeenCalled();
  });
});

describe("saveTenantJsonSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应 upsert tenantSetting 并返回 value", async () => {
    const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.appSetting.deleteMany).mockResolvedValue({ count: 0 });

    const value = { theme: "dark" };
    const result = await saveTenantJsonSetting("tenant-1", "ui_config", value);

    expect(result).toEqual(value);
    expect(prisma.tenantSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenant_id_key: { tenant_id: "tenant-1", key: "ui_config" } },
      }),
    );
  });

  it("DEFAULT_TENANT_ID 时也走 upsert tenantSetting(不清理 appSetting)", async () => {
    const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.upsert).mockResolvedValue({} as never);

    await saveTenantJsonSetting(DEFAULT_TENANT_ID, "ui_config", {
      theme: "dark",
    });

    expect(prisma.tenantSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenant_id_key: { tenant_id: DEFAULT_TENANT_ID, key: "ui_config" },
        },
      }),
    );
    expect(prisma.appSetting.deleteMany).not.toHaveBeenCalled();
  });
});
