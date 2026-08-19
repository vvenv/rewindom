import { type ReactElement } from "react";

import { useConfirm } from "@rewindom/client-kit";
import { getLocaleNativeLabel, type AppLocale } from "@rewindom/shared";
import { Field, FieldDescription, FieldLabel } from "@rewindom/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 主语言 = URL 上**不带前缀**的那一种，改它会改掉全站已收录的链接结构。
 * 选完先确认再钉本地草稿——保存时和站名同一次请求。
 */
export function SiteLocaleForm({
  form,
  canWrite,
}: {
  form: SiteSettingsForm;
  canWrite: boolean;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const { confirm } = useConfirm();
  const { locale } = form;

  const onValueChange = (value: string): void => {
    const next = value as AppLocale;
    if (!canWrite || next === locale.defaultLocale) return;
    void confirm({
      title: t("cms.defaultLocaleConfirmTitle"),
      description: t("cms.defaultLocaleConfirmDescription", {
        from: getLocaleNativeLabel(locale.defaultLocale),
        to: getLocaleNativeLabel(next),
        fromSlug: locale.defaultLocale,
      }),
      confirmText: t("cms.defaultLocaleConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (confirmed) locale.setDefaultLocale(next);
    });
  };

  return (
    <SettingsSection
      title={t("cms.settingsSectionLocale")}
      description={t("cms.settingsSectionLocaleHint")}
    >
      <Field>
        <FieldLabel htmlFor="default_locale">
          {t("cms.fieldDefaultLocale")}
        </FieldLabel>
        <Select
          disabled={!canWrite || form.saving}
          value={locale.defaultLocale}
          onValueChange={onValueChange}
        >
          <SelectTrigger id="default_locale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locale.locales.map((slug) => (
              <SelectItem key={slug} value={slug}>
                {getLocaleNativeLabel(slug)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>{t("cms.fieldDefaultLocaleHint")}</FieldDescription>
      </Field>
    </SettingsSection>
  );
}
