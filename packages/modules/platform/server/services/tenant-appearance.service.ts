import {
  normalizeOptionalLocale,
  normalizeOptionalShellLayout,
  normalizeOptionalThemePalette,
  type ResolvedTenantAppearance,
} from "@be-water/shared";

import {
  type TenantAppearance,
  type TenantAppearanceDetail,
  type UpdateTenantAppearanceBody,
  DEFAULT_TENANT_APPEARANCE,
  TENANT_SETTING_KEY_APPEARANCE,
} from "../../shared/index.js";

import { getPlatformSettings } from "./platform-settings.service.js";
import {
  getTenantJsonSetting,
  saveTenantJsonSetting,
} from "./tenant-json-setting.service.js";

function normalize(
  raw: Partial<TenantAppearance> | null | undefined,
): TenantAppearance {
  return {
    theme: normalizeOptionalThemePalette(raw?.theme),
    layout: normalizeOptionalShellLayout(raw?.layout),
    locale: normalizeOptionalLocale(raw?.locale),
  };
}

/** 租户自己的外观配置；字段为 `null` 表示该轴继承平台默认。 */
export async function getTenantAppearance(
  tenantId: string,
): Promise<TenantAppearance> {
  return getTenantJsonSetting<TenantAppearance>(
    tenantId,
    TENANT_SETTING_KEY_APPEARANCE,
    normalize,
    DEFAULT_TENANT_APPEARANCE,
  );
}

/**
 * 租户侧实际生效的外观：租户配置 > 平台默认，各轴各自独立解析。
 * 用户在浏览器里的个人选择优先级更高，但那只存在前端 localStorage，不进这里。
 */
export async function resolveTenantAppearance(
  tenantId: string,
): Promise<ResolvedTenantAppearance> {
  const [appearance, platformSettings] = await Promise.all([
    getTenantAppearance(tenantId),
    getPlatformSettings(),
  ]);

  return {
    theme: appearance.theme ?? platformSettings.default_theme,
    theme_source: appearance.theme !== null ? "tenant" : "platform",
    layout: appearance.layout ?? platformSettings.default_layout,
    layout_source: appearance.layout !== null ? "tenant" : "platform",
    locale: appearance.locale ?? platformSettings.default_locale,
    locale_source: appearance.locale !== null ? "tenant" : "platform",
  };
}

/** 平台控制台视角：原始配置 + 实际生效值 + 平台默认值（用于「继承」选项的文案）。 */
export async function getTenantAppearanceDetail(
  tenantId: string,
): Promise<TenantAppearanceDetail> {
  const [appearance, platformSettings] = await Promise.all([
    getTenantAppearance(tenantId),
    getPlatformSettings(),
  ]);

  return {
    theme: appearance.theme,
    layout: appearance.layout,
    locale: appearance.locale,
    resolved_theme: appearance.theme ?? platformSettings.default_theme,
    resolved_layout: appearance.layout ?? platformSettings.default_layout,
    resolved_locale: appearance.locale ?? platformSettings.default_locale,
    platform_default_theme: platformSettings.default_theme,
    platform_default_layout: platformSettings.default_layout,
    platform_default_locale: platformSettings.default_locale,
  };
}

/**
 * 只覆盖 body 里出现过的轴——未传的字段保持原值，避免「改布局把主题冲掉」。
 * 显式传 `null` 才是恢复继承。
 */
export async function saveTenantAppearance(
  tenantId: string,
  updates: UpdateTenantAppearanceBody,
): Promise<TenantAppearance> {
  const current = await getTenantAppearance(tenantId);

  const next: TenantAppearance = {
    theme:
      updates.theme === undefined
        ? current.theme
        : normalizeOptionalThemePalette(updates.theme),
    layout:
      updates.layout === undefined
        ? current.layout
        : normalizeOptionalShellLayout(updates.layout),
    locale:
      updates.locale === undefined
        ? current.locale
        : normalizeOptionalLocale(updates.locale),
  };

  return saveTenantJsonSetting<TenantAppearance>(
    tenantId,
    TENANT_SETTING_KEY_APPEARANCE,
    next,
  );
}
