import { prisma } from "@be-water/server-kernel/lib/prisma.js";
import { normalizeShellLayout, normalizeThemePalette } from "@be-water/shared";

import { type PlatformSettings, APP_SETTING_KEY_PLATFORM_SETTINGS, DEFAULT_PLATFORM_SETTINGS  } from "../../shared/index.js";



import type { Prisma } from "@be-water/server-kernel/generated/prisma/client/client.js";

function normalizeConfig(raw: unknown): PlatformSettings {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_PLATFORM_SETTINGS;
  }
  const obj = raw as Partial<PlatformSettings>;
  return {
    registration_enabled: obj.registration_enabled === true ? true : false,
    require_tenant_approval:
      obj.require_tenant_approval === true ? true : false,
    captcha_enabled: obj.captcha_enabled === true ? true : false,
    default_theme: normalizeThemePalette(
      obj.default_theme,
      DEFAULT_PLATFORM_SETTINGS.default_theme,
    ),
    default_layout: normalizeShellLayout(
      obj.default_layout,
      DEFAULT_PLATFORM_SETTINGS.default_layout,
    ),
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const dbConfig = await prisma.appSetting.findUnique({
    where: { key: APP_SETTING_KEY_PLATFORM_SETTINGS },
  });

  if (dbConfig?.value != null) {
    return normalizeConfig(dbConfig.value);
  }

  return DEFAULT_PLATFORM_SETTINGS;
}

export async function savePlatformSettings(
  config: PlatformSettings,
): Promise<PlatformSettings> {
  await prisma.appSetting.upsert({
    where: { key: APP_SETTING_KEY_PLATFORM_SETTINGS },
    create: {
      key: APP_SETTING_KEY_PLATFORM_SETTINGS,
      value: config as unknown as Prisma.InputJsonValue,
    },
    update: {
      value: config as unknown as Prisma.InputJsonValue,
    },
  });
  return config;
}
