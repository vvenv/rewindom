import { type ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rewindom/ui/dropdown-menu";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  analyticsScriptNeedsSiteId,
  analyticsScriptNeedsUrl,
  defaultAnalyticsScriptUrl,
  MAX_SITE_ANALYTICS_SCRIPTS,
  SITE_ANALYTICS_PROVIDERS,
  type SiteAnalyticsProvider,
} from "../../../shared/site-analytics.js";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

function siteIdPlaceholder(provider: SiteAnalyticsProvider): string {
  if (provider === "google_analytics") return "G-XXXXXXXXXX";
  if (provider === "google_tag_manager") return "GTM-XXXXXXX";
  if (provider === "microsoft_clarity") return "abcdefghij";
  if (provider === "plausible") return "example.com";
  if (provider === "cloudflare") return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
  return "00000000-0000-0000";
}

function scriptUrlHintKey(provider: SiteAnalyticsProvider): string {
  if (provider === "plausible") return "cms.fieldAnalyticsScriptUrlHintPlausible";
  if (provider === "cloudflare") {
    return "cms.fieldAnalyticsScriptUrlHintCloudflare";
  }
  return "cms.fieldAnalyticsScriptUrlHint";
}

/**
 * 访问分析：可装多条脚本。每条是供应商 + 标识（+ 可选脚本地址），不收任意 HTML。
 *
 * 改动只落在本地草稿，跟站点设置其它项一起保存。
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
  const scripts = analytics.value.scripts;
  const atMax = scripts.length >= MAX_SITE_ANALYTICS_SCRIPTS;
  const disabled = !canWrite || form.saving;

  return (
    <SettingsSection
      title={t("cms.settingsSectionAnalytics")}
      description={t("cms.settingsSectionAnalyticsHint")}
      aside={
        canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || atMax}
              >
                <Plus className="size-4" />
                {t("cms.analyticsAdd")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SITE_ANALYTICS_PROVIDERS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => analytics.add(key)}
                >
                  {t(`cms.analyticsProvider.${key}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null
      }
    >
      {scripts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("cms.analyticsEmpty")}</p>
      ) : (
        scripts.map((script, index) => {
          const provider = script.provider;
          return (
            <div
              key={`${provider}-${index}`}
              className="flex flex-col gap-3 rounded-lg border p-3"
            >
              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor={`analytics_provider_${index}`}>
                    {t("cms.fieldAnalyticsProvider")}
                    <FieldInfoTip text={t("cms.fieldAnalyticsProviderHint")} />
                  </FieldLabel>
                  {canWrite ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={t("cms.analyticsRemove")}
                      disabled={disabled}
                      onClick={() => analytics.remove(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
                <Select
                  disabled={disabled}
                  value={provider}
                  onValueChange={(next) =>
                    analytics.setProvider(index, next as SiteAnalyticsProvider)
                  }
                >
                  <SelectTrigger
                    id={`analytics_provider_${index}`}
                    className="w-full"
                  >
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
              </Field>

              {analyticsScriptNeedsSiteId(provider) ? (
                <Field>
                  <FieldLabel htmlFor={`analytics_site_id_${index}`}>
                    {t(`cms.fieldAnalyticsSiteId.${provider}`)}
                    <FieldInfoTip
                      text={t(`cms.fieldAnalyticsSiteIdHint.${provider}`)}
                    />
                  </FieldLabel>
                  <Input
                    id={`analytics_site_id_${index}`}
                    disabled={disabled}
                    value={script.site_id}
                    onChange={(event) =>
                      analytics.setSiteId(index, event.target.value)
                    }
                    placeholder={siteIdPlaceholder(provider)}
                  />
                </Field>
              ) : null}

              {analyticsScriptNeedsUrl(provider) ? (
                <Field>
                  <FieldLabel htmlFor={`analytics_script_url_${index}`}>
                    {t("cms.fieldAnalyticsScriptUrl")}
                    <FieldInfoTip text={t(scriptUrlHintKey(provider))} />
                  </FieldLabel>
                  <Input
                    id={`analytics_script_url_${index}`}
                    disabled={disabled}
                    value={script.script_url}
                    onChange={(event) =>
                      analytics.setScriptUrl(index, event.target.value)
                    }
                    placeholder={
                      defaultAnalyticsScriptUrl(provider) ??
                      "https://stats.example.com/script.js"
                    }
                  />
                </Field>
              ) : null}
            </div>
          );
        })
      )}
    </SettingsSection>
  );
}
