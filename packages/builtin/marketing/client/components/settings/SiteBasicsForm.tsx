import { type ReactElement } from "react";

import { FieldGroup } from "@rewindom/ui/field";
import { useTranslation } from "react-i18next";

import { LocalizedTextFields } from "./LocalizedTextFields.js";
import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 站名与标语：每种语言一个输入框，主语言必填。
 *
 * 跟其它分区共用底部那一次保存——不再失焦即存。
 */
export function SiteBasicsForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { basics } = form;

  return (
    <SettingsSection
      title={t("cms.settingsSectionBasics")}
      description={t("cms.settingsSectionBasicsHint")}
    >
      <FieldGroup>
        <LocalizedTextFields
          id="site_name"
          legend={t("cms.fieldSiteName")}
          value={basics.siteName}
          locales={basics.locales}
          defaultLocale={basics.defaultLocale}
          disabled={!canWrite}
          requiredPrimary
          onChange={basics.setSiteName}
        />
        <LocalizedTextFields
          id="tagline"
          legend={t("cms.fieldTagline")}
          value={basics.tagline}
          locales={basics.locales}
          defaultLocale={basics.defaultLocale}
          disabled={!canWrite}
          onChange={basics.setTagline}
        />
      </FieldGroup>
    </SettingsSection>
  );
}
