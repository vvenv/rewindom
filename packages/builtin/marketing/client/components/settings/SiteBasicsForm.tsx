import { type ReactElement } from "react";

import { getLocaleNativeLabel } from "@rewindom/shared";
import { Button } from "@rewindom/ui/button";
import { ButtonGroup } from "@rewindom/ui/button-group";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  readLocalizedSetting,
  writeLocalizedSetting,
} from "../../../shared/section-schema.js";

import { SettingsSection } from "./SettingsSection.js";

import type { SiteLocalizedText } from "../../../shared/site-cms.js";
import type { SiteSettingsForm } from "../../hooks/use-site-settings-form.js";

/**
 * 站名与标语：逐字段 `__i18n`，与页头文案同口径。
 *
 * **失焦即存**——窄 Sheet 里再配保存按钮，多数人改完就关，以为已经生效。
 * 主语言站名为空时不落库，并把编辑语言切回去让人看见。
 *
 * 译文切换按钮组挂在分区标题行右侧——它只作用于这一组输入框，和「语言」分区里的
 * 主语言不是一回事：前者是「正在填哪种译文」，后者是站点 URL 的默认语言。
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
  const { defaultLocale, editLocale } = basics;

  const commit = (): void => {
    if (!canWrite || !basics.dirty) return;
    if (!basics.primaryName) {
      basics.setEditLocale(defaultLocale);
      toast.error(
        t("cms.toastSiteNameRequired", {
          locale: getLocaleNativeLabel(defaultLocale),
        }),
      );
      return;
    }
    basics.commit({
      onSuccess: () => toast.success(t("cms.toastSiteSaved")),
      onError: () => {
        basics.restore();
        toast.error(t("cms.toastSiteSaveFailed"));
      },
    });
  };

  const localized = (value: SiteLocalizedText) => ({
    value: readLocalizedSetting(value, editLocale, defaultLocale),
    fallback:
      editLocale !== defaultLocale
        ? readLocalizedSetting(value, defaultLocale, defaultLocale)
        : "",
  });

  const name = localized(basics.siteName);
  const tagline = localized(basics.tagline);

  const fallbackHint = (fallback: string): ReactElement | null =>
    editLocale === defaultLocale ? null : (
      <FieldDescription>
        {fallback
          ? t("cms.fieldLocalizedFallbackHint", { fallback })
          : t("cms.fieldLocalizedEmptyHint")}
      </FieldDescription>
    );

  return (
    <SettingsSection
      title={t("cms.settingsSectionBasics")}
      description={t("cms.settingsSectionBasicsHint")}
      aside={
        basics.locales.length > 1 ? (
          <ButtonGroup aria-label={t("cms.fieldEditLocale")}>
            {basics.locales.map((slug) => (
              <Button
                key={slug}
                type="button"
                size="sm"
                variant={slug === editLocale ? "secondary" : "outline"}
                aria-pressed={slug === editLocale}
                onClick={() => basics.setEditLocale(slug)}
              >
                {getLocaleNativeLabel(slug)}
              </Button>
            ))}
          </ButtonGroup>
        ) : null
      }
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="site_name">{t("cms.fieldSiteName")}</FieldLabel>
          <Input
            id="site_name"
            disabled={!canWrite}
            value={name.value}
            placeholder={name.fallback || undefined}
            onChange={(e) =>
              basics.setSiteName(
                writeLocalizedSetting(
                  basics.siteName,
                  editLocale,
                  defaultLocale,
                  e.target.value,
                ) as SiteLocalizedText,
              )
            }
            onBlur={commit}
            required={editLocale === defaultLocale}
          />
          {fallbackHint(name.fallback)}
        </Field>

        <Field>
          <FieldLabel htmlFor="tagline">{t("cms.fieldTagline")}</FieldLabel>
          <Input
            id="tagline"
            disabled={!canWrite}
            value={tagline.value}
            placeholder={tagline.fallback || undefined}
            onChange={(e) =>
              basics.setTagline(
                writeLocalizedSetting(
                  basics.tagline,
                  editLocale,
                  defaultLocale,
                  e.target.value,
                ) as SiteLocalizedText,
              )
            }
            onBlur={commit}
          />
          {fallbackHint(tagline.fallback)}
        </Field>
      </FieldGroup>
    </SettingsSection>
  );
}
