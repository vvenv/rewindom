import { type ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/client-kit";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * Google AdSense：一个发布商 ID。整段官方 snippet 贴进来也可以，会抽出 ca-pub-。
 *
 * 改动只落在本地草稿，跟站点设置其它项一起保存。
 */
export function SiteAdsForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const disabled = !canWrite || form.saving;

  return (
    <SettingsSection
      title={t("cms.settingsSectionAds")}
      description={t("cms.settingsSectionAdsHint")}
    >
      <Field>
        <FieldLabel htmlFor="adsense_publisher_id">
          {t("cms.fieldAdsensePublisherId")}
          <FieldInfoTip text={t("cms.fieldAdsensePublisherIdHint")} />
        </FieldLabel>
        <Input
          id="adsense_publisher_id"
          disabled={disabled}
          value={form.ads.value.google_adsense_publisher_id}
          onChange={(event) => form.ads.setPublisherId(event.target.value)}
          placeholder="ca-pub-xxxxxxxxxxxxxxxx"
        />
      </Field>
    </SettingsSection>
  );
}
