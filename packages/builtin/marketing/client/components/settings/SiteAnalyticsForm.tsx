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
 * 不收任意 HTML。改动只落在本地草稿，跟站点设置其它项一起保存——换供应商
 * 时 token 还是空的，不能先发一次请求（服务端会把不完整配置归一成关闭）。
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
          onValueChange={(next) =>
            analytics.setProvider(next as SiteAnalyticsProvider)
          }
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
