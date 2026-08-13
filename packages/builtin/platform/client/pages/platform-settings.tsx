import {
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rewindom/ui/card";
import { Spinner } from "@rewindom/ui/spinner";
import { Switch } from "@rewindom/ui/switch";
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
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground hidden md:block">
        {t("platform:settings.description")}
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <ShieldCheck className="size-4" />
            {t("platform:settings.registration.title")}
          </CardTitle>
          <CardDescription>
            {t("platform:settings.registration.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {t("platform:settings.registration.enable")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  single_tenant
                    ? "platform:settings.registration.hintSingleTenant"
                    : "platform:settings.registration.hint",
                )}
              </p>
            </div>
            <Switch
              checked={settings?.registration_enabled ?? false}
              onCheckedChange={handleRegistrationEnabledChange}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {!single_tenant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <UserCheck className="size-4" />
              {t("platform:settings.tenantApproval.title")}
            </CardTitle>
            <CardDescription>
              {t("platform:settings.tenantApproval.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {t("platform:settings.tenantApproval.require")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("platform:settings.tenantApproval.hint")}
                </p>
              </div>
              <Switch
                checked={settings?.require_tenant_approval ?? false}
                onCheckedChange={handleRequireTenantApprovalChange}
                disabled={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <ScanEye className="size-4" />
            {t("platform:settings.captcha.title")}
          </CardTitle>
          <CardDescription>
            {t("platform:settings.captcha.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {t("platform:settings.captcha.enable")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("platform:settings.captcha.hint")}
              </p>
            </div>
            <Switch
              checked={settings?.captcha_enabled ?? false}
              onCheckedChange={handleCaptchaEnabledChange}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <Palette className="size-4" />
            {t("platform:settings.defaultTheme.title")}
          </CardTitle>
          <CardDescription>
            {t("platform:settings.defaultTheme.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceOptionGroup
            idPrefix="platform-theme"
            value={settings?.default_theme ?? ""}
            options={translateThemePaletteOptions(t)}
            onChange={handleDefaultThemeChange}
            disabled={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <PanelsTopLeft className="size-4" />
            {t("platform:settings.defaultLayout.title")}
          </CardTitle>
          <CardDescription>
            {t("platform:settings.defaultLayout.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceOptionGroup
            idPrefix="platform-layout"
            value={settings?.default_layout ?? ""}
            options={translateShellLayoutOptions(t)}
            onChange={handleDefaultLayoutChange}
            disabled={updateMutation.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <Languages className="size-4" />
            {t("defaultLocale")}
          </CardTitle>
          <CardDescription>{t("defaultLocaleDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
