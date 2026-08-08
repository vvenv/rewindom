import {
  getLocaleLabel,
  getShellLayoutLabel,
  getThemePaletteLabel,
  type AppLocale,
  type ShellLayoutSlug,
  type ThemePaletteSlug,
} from "@be-water/shared";

/** `TenantSetting.key` —— 租户外观配置（主题 + 布局 + 语言）。 */
export const TENANT_SETTING_KEY_APPEARANCE = "appearance";

/** 租户侧外观配置。字段为 `null` 表示该轴继承平台默认。 */
export interface TenantAppearance {
  theme: ThemePaletteSlug | null;
  layout: ShellLayoutSlug | null;
  locale: AppLocale | null;
}

export const DEFAULT_TENANT_APPEARANCE: TenantAppearance = {
  theme: null,
  layout: null,
  locale: null,
};

/** 平台控制台读租户外观时的返回：原始配置 + 实际生效值 + 平台默认值。 */
export interface TenantAppearanceDetail extends TenantAppearance {
  resolved_theme: ThemePaletteSlug;
  resolved_layout: ShellLayoutSlug;
  resolved_locale: AppLocale;
  platform_default_theme: ThemePaletteSlug;
  platform_default_layout: ShellLayoutSlug;
  platform_default_locale: AppLocale;
}

/**
 * 各轴分别可选：只传 `theme` 就只改主题，其余轴保持不动。
 * 显式传 `null` 才是「恢复继承平台默认」。
 */
export interface UpdateTenantAppearanceBody {
  theme?: ThemePaletteSlug | null;
  layout?: ShellLayoutSlug | null;
  locale?: AppLocale | null;
}

export function formatTenantAppearanceAuditDetails(
  tenantSlug: string,
  before: TenantAppearance,
  after: TenantAppearance,
): string {
  const changes: string[] = [];

  if (before.theme !== after.theme) {
    changes.push(
      `默认主题：${describe(before.theme, getThemePaletteLabel)} → ${describe(after.theme, getThemePaletteLabel)}`,
    );
  }
  if (before.layout !== after.layout) {
    changes.push(
      `默认布局：${describe(before.layout, getShellLayoutLabel)} → ${describe(after.layout, getShellLayoutLabel)}`,
    );
  }
  if (before.locale !== after.locale) {
    changes.push(
      `默认语言：${describe(before.locale, getLocaleLabel)} → ${describe(after.locale, getLocaleLabel)}`,
    );
  }

  return changes.length > 0
    ? `tenant=${tenantSlug}，${changes.join("，")}`
    : `tenant=${tenantSlug}，无变更`;
}

function describe(
  slug: string | null,
  toLabel: (slug: string) => string,
): string {
  return slug === null ? "继承平台默认" : toLabel(slug);
}
