import {
  SettingsPanel,
  SettingsStack,
  SettingsToggleRow,
  translateShellLayoutOptions,
  translateThemePaletteOptions,
  useConfirm,
  usePublicConfig,
} from "@rewindom/client-kit";
import {
  APP_LOCALES,
  isAppLocale,
  isShellLayoutSlug,
  isThemePaletteSlug,
} from "@rewindom/shared";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import {
  ShieldCheck,
  UserCheck,
  ScanEye,
  Palette,
  PanelsTopLeft,
  Languages,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { AppearanceOptionGroup } from "../components/AppearanceOptionGroup.js";
import { usePlatformSettings } from "../hooks/usePlatformSettings.js";
import { useUpdatePlatformSettings } from "../hooks/useUpdatePlatformSettings.js";

export function PlatformSettings() {
  const { t } = useTranslation(["shell", "common", "platform"]);
  const {
    data: { single_tenant },
  } = usePublicConfig();
  const { data: settings, isLoading } = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();
  const { confirm } = useConfirm();

  const handleRegistrationEnabledChange = async (checked: boolean) => {
    if (!checked) {
      const confirmed = await confirm({
        title: t("platform:settings.registration.confirmDisableTitle"),
        description: t("platform:settings.registration.confirmDisableDescription"),
        confirmText: t("platform:settings.registration.confirmDisable"),
        cancelText: t("common:cancel"),
      });
      if (!confirmed) return;
    }

    updateMutation.mutate(
      { registration_enabled: checked },
      {
        onSuccess: () => toast.success(t("platform:settings.registration.updated")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("common:updateFailed"),
          ),
      },
    );
  };

  const handleRequireTenantApprovalChange = (checked: boolean) => {
    updateMutation.mutate(
      { require_tenant_approval: checked },
      {
        onSuccess: () => toast.success(t("platform:settings.tenantApproval.updated")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("common:updateFailed"),
          ),
      },
    );
  };

  const handleDefaultThemeChange = (value: string) => {
    if (!isThemePaletteSlug(value)) return;

    updateMutation.mutate(
      { default_theme: value },
      {
        onSuccess: () => toast.success(t("platform:settings.defaultTheme.updated")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("common:updateFailed"),
          ),
      },
    );
  };

  const handleDefaultLayoutChange = (value: string) => {
    if (!isShellLayoutSlug(value)) return;

    updateMutation.mutate(
      { default_layout: value },
      {
        onSuccess: () => toast.success(t("platform:settings.defaultLayout.updated")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("common:updateFailed"),
          ),
      },
    );
  };

  const handleDefaultLocaleChange = (value: string) => {
    if (!isAppLocale(value)) return;

    updateMutation.mutate(
      { default_locale: value },
      {
        onSuccess: () => toast.success(t("defaultLocaleUpdated")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("common:updateFailed"),
          ),
      },
    );
  };

  const handleCaptchaEnabledChange = (checked: boolean) => {
    updateMutation.mutate(
      { captcha_enabled: checked },
      {
        onSuccess: () => toast.success(t("platform:settings.captcha.updated")),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : t("common:updateFailed"),
          ),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <SettingsStack>
      <p className="text-muted-foreground hidden md:block">
        {t("platform:settings.description")}
      </p>

      <SettingsPanel
        icon={ShieldCheck}
        title={t("platform:settings.registration.title")}
        description={t("platform:settings.registration.description")}
      >
        <SettingsToggleRow
          id="platform-registration"
          label={t("platform:settings.registration.enable")}
          description={t(
            single_tenant
              ? "platform:settings.registration.hintSingleTenant"
              : "platform:settings.registration.hint",
          )}
          checked={settings?.registration_enabled ?? false}
          onCheckedChange={(checked) => void handleRegistrationEnabledChange(checked)}
          disabled={updateMutation.isPending}
        />
      </SettingsPanel>

      {!single_tenant ? (
        <SettingsPanel
          icon={UserCheck}
          title={t("platform:settings.tenantApproval.title")}
          description={t("platform:settings.tenantApproval.description")}
        >
          <SettingsToggleRow
            id="platform-tenant-approval"
            label={t("platform:settings.tenantApproval.require")}
            description={t("platform:settings.tenantApproval.hint")}
            checked={settings?.require_tenant_approval ?? false}
            onCheckedChange={handleRequireTenantApprovalChange}
            disabled={updateMutation.isPending}
          />
        </SettingsPanel>
      ) : null}

      <SettingsPanel
        icon={ScanEye}
        title={t("platform:settings.captcha.title")}
        description={t("platform:settings.captcha.description")}
      >
        <SettingsToggleRow
          id="platform-captcha"
          label={t("platform:settings.captcha.enable")}
          description={t("platform:settings.captcha.hint")}
          checked={settings?.captcha_enabled ?? false}
          onCheckedChange={handleCaptchaEnabledChange}
          disabled={updateMutation.isPending}
        />
      </SettingsPanel>

      <SettingsPanel
        icon={Palette}
        title={t("platform:settings.defaultTheme.title")}
        description={t("platform:settings.defaultTheme.description")}
      >
        <AppearanceOptionGroup
          idPrefix="platform-theme"
          value={settings?.default_theme ?? ""}
          options={translateThemePaletteOptions(t)}
          onChange={handleDefaultThemeChange}
          disabled={updateMutation.isPending}
        />
      </SettingsPanel>

      <SettingsPanel
        icon={PanelsTopLeft}
        title={t("platform:settings.defaultLayout.title")}
        description={t("platform:settings.defaultLayout.description")}
      >
        <AppearanceOptionGroup
          idPrefix="platform-layout"
          value={settings?.default_layout ?? ""}
          options={translateShellLayoutOptions(t)}
          onChange={handleDefaultLayoutChange}
          disabled={updateMutation.isPending}
        />
      </SettingsPanel>

      <SettingsPanel
        icon={Languages}
        title={t("defaultLocale")}
        description={t("defaultLocaleDescription")}
      >
        <AppearanceOptionGroup
          idPrefix="platform-locale"
          value={settings?.default_locale ?? ""}
          options={APP_LOCALES.map((locale) => ({
            slug: locale.slug,
            label: locale.native_label,
            description: locale.label,
          }))}
          onChange={handleDefaultLocaleChange}
          disabled={updateMutation.isPending}
        />
      </SettingsPanel>
    </SettingsStack>
  );
}
