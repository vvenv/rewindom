import { type ReactElement } from "react";

import { Field, FieldDescription, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  defaultAnalyticsScriptUrl,
  SITE_ANALYTICS_PROVIDERS,
  type SiteAnalyticsProvider,
} from "../../../shared/site-analytics.js";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 访问分析：一个供应商 + 一个脚本地址 + 一个站点标识。
 *
 * 不收任意 HTML —— 粘一段 `<script>` 等于给站点开一个脚本注入位。列出的供应商
 * 都不写 cookie，因而不需要同意横幅；要用 GA 这类的请自己在 `custom` 里填脚本地址，
 * 同意管理不在这里做。
 *
 * 供应商下拉即存，两个输入框失焦即存——与站名同一条口径。
 */
export function SiteAnalyticsForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { analytics } = form;
  const provider = analytics.value.provider;

  const commit = (): void => {
    if (!canWrite || !analytics.dirty) return;
    analytics.commit({
      onSuccess: () => toast.success(t("cms.toastSiteSaved")),
      onError: () => toast.error(t("cms.toastSiteSaveFailed")),
    });
  };

  const onProviderChange = (next: string): void => {
    analytics.setProvider(next as SiteAnalyticsProvider, {
      onSuccess: () => toast.success(t("cms.toastSiteSaved")),
      onError: () => toast.error(t("cms.toastSiteSaveFailed")),
    });
  };

  return (
    <SettingsSection
      title={t("cms.settingsSectionAnalytics")}
      description={t("cms.settingsSectionAnalyticsHint")}
    >
      <Field>
        <FieldLabel htmlFor="analytics_provider">
          {t("cms.fieldAnalyticsProvider")}
        </FieldLabel>
        <Select
          disabled={!canWrite || form.saving}
          value={provider}
          onValueChange={onProviderChange}
        >
          <SelectTrigger id="analytics_provider" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SITE_ANALYTICS_PROVIDERS.map((key) => (
              <SelectItem key={key} value={key}>
                {t(`cms.analyticsProvider.${key}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          {t("cms.fieldAnalyticsProviderHint")}
        </FieldDescription>
      </Field>

      {provider !== "none" && provider !== "custom" ? (
        <Field>
          <FieldLabel htmlFor="analytics_site_id">
            {t(`cms.fieldAnalyticsSiteId.${provider}`)}
          </FieldLabel>
          <Input
            id="analytics_site_id"
            disabled={!canWrite || form.saving}
            value={analytics.value.site_id}
            onChange={(event) => analytics.setSiteId(event.target.value)}
            onBlur={commit}
            placeholder={
              provider === "plausible"
                ? "example.com"
                : provider === "cloudflare"
                  ? "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  : "00000000-0000-0000"
            }
          />
          <FieldDescription>
            {t(`cms.fieldAnalyticsSiteIdHint.${provider}`)}
          </FieldDescription>
        </Field>
      ) : null}

      {provider !== "none" ? (
        <Field>
          <FieldLabel htmlFor="analytics_script_url">
            {t("cms.fieldAnalyticsScriptUrl")}
          </FieldLabel>
          <Input
            id="analytics_script_url"
            disabled={!canWrite || form.saving}
            value={analytics.value.script_url}
            onChange={(event) => analytics.setScriptUrl(event.target.value)}
            onBlur={commit}
            placeholder={
              defaultAnalyticsScriptUrl(provider) ??
              "https://stats.example.com/script.js"
            }
          />
          <FieldDescription>
            {provider === "plausible"
              ? t("cms.fieldAnalyticsScriptUrlHintPlausible")
              : provider === "cloudflare"
                ? t("cms.fieldAnalyticsScriptUrlHintCloudflare")
                : t("cms.fieldAnalyticsScriptUrlHint")}
          </FieldDescription>
        </Field>
      ) : null}
    </SettingsSection>
  );
}
