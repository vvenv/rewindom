import {
  DEFAULT_SHELL_LAYOUT,
  DEFAULT_THEME_PALETTE,
  type ShellLayoutSlug,
  type ThemePaletteSlug,
} from "@be-water/shared";

export const APP_SETTING_KEY_PLATFORM_SETTINGS = "platform_settings";

export interface PlatformSettings {
  registration_enabled: boolean;
  require_tenant_approval: boolean;
  captcha_enabled: boolean;
  /** 租户侧默认主题（配色方案）。租户未单独配置时生效。 */
  default_theme: ThemePaletteSlug;
  /** 租户侧默认外壳布局。租户未单独配置时生效；仅 md+ 生效。 */
  default_layout: ShellLayoutSlug;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  registration_enabled: false,
  require_tenant_approval: false,
  captcha_enabled: false,
  default_theme: DEFAULT_THEME_PALETTE,
  default_layout: DEFAULT_SHELL_LAYOUT,
};
