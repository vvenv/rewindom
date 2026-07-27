import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
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

vi.mock("@be-water/shared", async (importOriginal) => {
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
    const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
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

  it("tenantSetting 不存在且为 DEFAULT_TENANT_ID 时应回退到 appSetting", async () => {
    const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
      value: { theme: "dark" },
    } as never);

    const result = await getTenantJsonSetting(
      DEFAULT_TENANT_ID,
      "ui_config",
      (raw) => ({ theme: (raw as { theme?: string })?.theme ?? "light" }),
      { theme: "light" },
    );

    expect(result).toEqual({ theme: "dark" });
  });

  it("两者都不存在时应返回 defaultValue 的 normalize 结果", async () => {
    const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
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
    const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
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
    const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
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

  it("DEFAULT_TENANT_ID 时应删除旧 appSetting", async () => {
    const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
    vi.mocked(prisma.tenantSetting.upsert).mockResolvedValue({} as never);
    vi.mocked(prisma.appSetting.deleteMany).mockResolvedValue({ count: 1 });

    await saveTenantJsonSetting(DEFAULT_TENANT_ID, "ui_config", {
      theme: "dark",
    });

    expect(prisma.appSetting.deleteMany).toHaveBeenCalledWith({
      where: { key: "ui_config" },
    });
  });
});
