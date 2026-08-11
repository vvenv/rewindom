import { type FormEvent, type ReactElement } from "react";

import { useConfirm } from "@be-water/client-kit";
import { getLocaleNativeLabel, type AppLocale } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import { Field, FieldDescription, FieldLabel } from "@be-water/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Spinner } from "@be-water/ui/spinner";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 主语言 = URL 上**不带前缀**的那一种，改它会改掉全站已收录的链接结构。
 * 所以改动当场标红，保存时还要再确认一次——它不该和改标语一样顺手。
 *
 * 提交时连带把站名 / 标语一起存：纯字符串文案的语言是隐含的，换主语言前必须先把
 * 它们钉在原语言下（见 `use-site-settings-form` 的 `pinToLocale`），分两次请求存
 * 会在中间留下一个「文案语言已失真」的窗口。
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

  const onSubmit = (event: FormEvent): void => {
    event.preventDefault();
    void confirm({
      title: t("cms.defaultLocaleConfirmTitle"),
      description: t("cms.defaultLocaleConfirmDescription", {
        from: getLocaleNativeLabel(locale.savedLocale),
        to: getLocaleNativeLabel(locale.defaultLocale),
        fromSlug: locale.savedLocale,
      }),
      confirmText: t("cms.defaultLocaleConfirm"),
      destructive: true,
    }).then((confirmed) => {
      if (!confirmed) return;
      locale.save({ onSuccess: () => toast.success(t("cms.toastSiteSaved")) });
    });
  };

  return (
    <form onSubmit={onSubmit}>
      <SettingsSection
        title={t("cms.settingsSectionLocale")}
        description={t("cms.settingsSectionLocaleHint")}
        footer={
          canWrite ? (
            <div className="flex items-center gap-2">
              {locale.changed ? (
                <Button type="button" variant="ghost" onClick={locale.reset}>
                  {t("cms.discardConfirm")}
                </Button>
              ) : null}
              <Button type="submit" disabled={!locale.changed || form.saving}>
                {form.saving ? <Spinner className="size-4" /> : null}
                {t("cms.save")}
              </Button>
            </div>
          ) : null
        }
      >
        <Field>
          <FieldLabel htmlFor="default_locale">
            {t("cms.fieldDefaultLocale")}
          </FieldLabel>
          <Select
            disabled={!canWrite}
            value={locale.defaultLocale}
            onValueChange={(value) => locale.change(value as AppLocale)}
          >
            <SelectTrigger id="default_locale" className="w-full sm:w-64">
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
          {locale.changed ? (
            <FieldDescription className="font-medium text-destructive">
              {t("cms.fieldDefaultLocaleWarning", {
                from: getLocaleNativeLabel(locale.savedLocale),
                to: getLocaleNativeLabel(locale.defaultLocale),
              })}
            </FieldDescription>
          ) : null}
        </Field>
      </SettingsSection>
    </form>
  );
}
