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

import {
  getTenantAppearance,
  getTenantAppearanceDetail,
  resolveTenantAppearance,
  saveTenantAppearance,
} from "./tenant-appearance.service.js";

const TENANT_ID = "11111111-1111-1111-1111-111111111111";

/**
 * `getTenantAppearance` 读 tenantSetting，`getPlatformSettings` 读 appSetting，
 * 两者共用同一个 prisma mock，所以按表分别打桩。
 */
async function stub(options: {
  tenant?: Record<string, unknown>;
  platform?: Record<string, unknown>;
}): Promise<void> {
  const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
  vi.mocked(prisma.tenantSetting.findUnique).mockResolvedValue(
    options.tenant === undefined
      ? null
      : ({ value: options.tenant } as never),
  );
  vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(
    options.platform === undefined
      ? null
      : ({ value: options.platform } as never),
  );
}

describe("tenant-appearance.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTenantAppearance", () => {
    it("租户未配置时各轴都是 null（继承）", async () => {
      await stub({});
      expect(await getTenantAppearance(TENANT_ID)).toEqual({
        theme: null,
        layout: null,
        locale: null,
      });
    });

    it("按原值返回已配置的轴，未配置的轴保持 null", async () => {
      await stub({ tenant: { theme: "slate" } });
      expect(await getTenantAppearance(TENANT_ID)).toEqual({
        theme: "slate",
        layout: null,
        locale: null,
      });
    });

    it("未注册的 slug 降级为继承", async () => {
      await stub({
        tenant: { theme: "neon", layout: "diagonal", locale: "ja" },
      });
      expect(await getTenantAppearance(TENANT_ID)).toEqual({
        theme: null,
        layout: null,
        locale: null,
      });
    });
  });

  describe("resolveTenantAppearance", () => {
    it("优先用租户配置，并标注来源", async () => {
      await stub({
        tenant: { theme: "slate", layout: "topbar", locale: "en" },
        platform: {
          default_theme: "azure",
          default_layout: "sidebar",
          default_locale: "zh-CN",
        },
      });
      expect(await resolveTenantAppearance(TENANT_ID)).toEqual({
        theme: "slate",
        theme_source: "tenant",
        layout: "topbar",
        layout_source: "tenant",
        locale: "en",
        locale_source: "tenant",
      });
    });

    it("各轴各自独立解析——租户只覆盖布局时，主题与语言仍继承平台", async () => {
      await stub({
        tenant: { layout: "topbar" },
        platform: {
          default_theme: "slate",
          default_layout: "sidebar",
          default_locale: "en",
        },
      });
      expect(await resolveTenantAppearance(TENANT_ID)).toEqual({
        theme: "slate",
        theme_source: "platform",
        layout: "topbar",
        layout_source: "tenant",
        locale: "en",
        locale_source: "platform",
      });
    });

    it("两级都没配时回落到代码默认", async () => {
      await stub({});
      expect(await resolveTenantAppearance(TENANT_ID)).toEqual({
        theme: "azure",
        theme_source: "platform",
        layout: "sidebar",
        layout_source: "platform",
        locale: "zh-CN",
        locale_source: "platform",
      });
    });
  });

  it("getTenantAppearanceDetail 同时给出原始值、生效值与平台默认", async () => {
    await stub({
      tenant: { layout: "topbar", locale: "en" },
      platform: {
        default_theme: "slate",
        default_layout: "sidebar",
        default_locale: "zh-CN",
      },
    });
    expect(await getTenantAppearanceDetail(TENANT_ID)).toEqual({
      theme: null,
      layout: "topbar",
      locale: "en",
      resolved_theme: "slate",
      resolved_layout: "topbar",
      resolved_locale: "en",
      platform_default_theme: "slate",
      platform_default_layout: "sidebar",
      platform_default_locale: "zh-CN",
    });
  });

  describe("saveTenantAppearance", () => {
    async function savedValue(): Promise<unknown> {
      const { prisma } = await import("@rewindom/server-kernel/lib/prisma.js");
      const call = vi.mocked(prisma.tenantSetting.upsert).mock.calls[0]?.[0] as
        | { create?: { value?: unknown } }
        | undefined;
      return call?.create?.value;
    }

    it("未传的轴保持原值——改布局不会把主题冲掉", async () => {
      await stub({ tenant: { theme: "slate", layout: null, locale: "en" } });

      await saveTenantAppearance(TENANT_ID, { layout: "topbar" });

      expect(await savedValue()).toEqual({
        theme: "slate",
        layout: "topbar",
        locale: "en",
      });
    });

    it("显式传 null 才是恢复继承", async () => {
      await stub({
        tenant: { theme: "slate", layout: "topbar", locale: "en" },
      });

      await saveTenantAppearance(TENANT_ID, { theme: null, locale: null });

      expect(await savedValue()).toEqual({
        theme: null,
        layout: "topbar",
        locale: null,
      });
    });

    it("非法 slug 写成 null", async () => {
      await stub({});

      await saveTenantAppearance(TENANT_ID, {
        theme: "neon" as never,
        layout: "diagonal" as never,
        locale: "ja" as never,
      });

      expect(await savedValue()).toEqual({
        theme: null,
        layout: null,
        locale: null,
      });
    });
  });
});
