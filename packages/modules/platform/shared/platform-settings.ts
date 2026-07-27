export const APP_SETTING_KEY_PLATFORM_SETTINGS = "platform_settings";

export interface PlatformSettings {
  registration_enabled: boolean;
  require_tenant_approval: boolean;
  captcha_enabled: boolean;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  registration_enabled: false,
  require_tenant_approval: false,
  captcha_enabled: false,
};
