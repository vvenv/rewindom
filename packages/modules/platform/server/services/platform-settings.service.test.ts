import { type PlatformSettings, DEFAULT_PLATFORM_SETTINGS  } from "../../shared/index.js";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@be-water/server-kernel/lib/prisma.js", () => ({
  prisma: {
    appSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import {
  getPlatformSettings,
  savePlatformSettings,
} from "./platform-settings.service.js";

describe("platform-settings.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("normalizeConfig (via getPlatformSettings)", () => {
    it("should return default settings for null input", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(null);

      const result = await getPlatformSettings();

      expect(result).toEqual(DEFAULT_PLATFORM_SETTINGS);
    });

    it("should return default settings when value is not an object", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
        value: "not-an-object",
      } as never);

      const result = await getPlatformSettings();

      expect(result).toEqual(DEFAULT_PLATFORM_SETTINGS);
    });

    it("should normalize valid config with both fields true", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      const dbConfig = {
        registration_enabled: true,
        require_tenant_approval: true,
      };
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
        value: dbConfig,
      } as never);

      const result = await getPlatformSettings();

      expect(result).toEqual({
        ...dbConfig,
        captcha_enabled: false,
      });
    });

    it("should normalize config with falsy values to false", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
        value: {
          registration_enabled: "true" as unknown as boolean,
          require_tenant_approval: 1 as unknown as boolean,
        },
      } as never);

      const result = await getPlatformSettings();

      // "true" === true is false, 1 === true is false
      expect(result.registration_enabled).toBe(false);
      expect(result.require_tenant_approval).toBe(false);
    });

    it("should handle partial config with only one field", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
        value: { registration_enabled: true },
      } as never);

      const result = await getPlatformSettings();

      expect(result.registration_enabled).toBe(true);
      expect(result.require_tenant_approval).toBe(false);
      expect(result.captcha_enabled).toBe(false);
    });

    it("should normalize captcha_enabled when present", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
        value: {
          registration_enabled: true,
          require_tenant_approval: false,
          captcha_enabled: true,
        },
      } as never);

      const result = await getPlatformSettings();

      expect(result.captcha_enabled).toBe(true);
    });
  });

  describe("getPlatformSettings", () => {
    it("should return DB config when value exists", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      const dbConfig = {
        registration_enabled: true,
        require_tenant_approval: false,
      };
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue({
        value: dbConfig,
      } as never);

      const result = await getPlatformSettings();

      expect(result).toEqual({
        ...dbConfig,
        captcha_enabled: false,
      });
      expect(prisma.appSetting.findUnique).toHaveBeenCalledWith({
        where: { key: "platform_settings" },
      });
    });

    it("should return default settings when no DB config", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.findUnique).mockResolvedValue(null);

      const result = await getPlatformSettings();

      expect(result).toEqual(DEFAULT_PLATFORM_SETTINGS);
    });
  });

  describe("savePlatformSettings", () => {
    it("should upsert platform settings and return the config", async () => {
      const { prisma } = await import("@be-water/server-kernel/lib/prisma.js");
      vi.mocked(prisma.appSetting.upsert).mockResolvedValue({} as never);

      const config: PlatformSettings = {
        registration_enabled: true,
        require_tenant_approval: true,
        captcha_enabled: false,
      };

      const result = await savePlatformSettings(config);

      expect(result).toEqual(config);
      expect(prisma.appSetting.upsert).toHaveBeenCalledWith({
        where: { key: "platform_settings" },
        create: {
          key: "platform_settings",
          value: config as unknown as undefined,
        },
        update: {
          value: config as unknown as undefined,
        },
      });
    });
  });
});
