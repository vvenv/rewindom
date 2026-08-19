import { type ReactElement } from "react";

import { getLocaleNativeLabel, type AppLocale } from "@rewindom/shared";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { useTranslation } from "react-i18next";

import {
  readLocalizedSetting,
  writeLocalizedSetting,
} from "../../../shared/section-schema.js";

import type { SiteLocalizedText } from "../../../shared/site-cms.js";

/**
 * 一段可本地化文案：每种语言一个输入框，主语言排第一。
 *
 * 不再用 tab 切译文——站点设置只有中英两种，展开比切换看得清，也不会在保存
 * 刷新后把「正在填哪种语言」冲掉。
 */
export function LocalizedTextFields({
  id,
  legend,
  value,
  locales,
  defaultLocale,
  disabled,
  requiredPrimary = false,
  onChange,
}: {
  id: string;
  legend: string;
  value: SiteLocalizedText;
  locales: AppLocale[];
  defaultLocale: AppLocale;
  disabled: boolean;
  requiredPrimary?: boolean;
  onChange: (next: SiteLocalizedText) => void;
}): ReactElement {
  const { t } = useTranslation("marketing");
  const primary = readLocalizedSetting(value, defaultLocale, defaultLocale);

  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <FieldGroup>
        {locales.map((locale) => {
          const isPrimary = locale === defaultLocale;
          const text = readLocalizedSetting(value, locale, defaultLocale);
          return (
            <Field key={locale}>
              <FieldLabel htmlFor={`${id}-${locale}`}>
                {getLocaleNativeLabel(locale)}
              </FieldLabel>
              <Input
                id={`${id}-${locale}`}
                disabled={disabled}
                value={text}
                placeholder={
                  !isPrimary && primary ? primary : undefined
                }
                required={isPrimary && requiredPrimary}
                onChange={(event) =>
                  onChange(
                    writeLocalizedSetting(
                      value,
                      locale,
                      defaultLocale,
                      event.target.value,
                    ) as SiteLocalizedText,
                  )
                }
              />
              {isPrimary ? null : (
                <FieldDescription>
                  {primary
                    ? t("cms.fieldLocalizedFallbackHint", {
                        fallback: primary,
                      })
                    : t("cms.fieldLocalizedEmptyHint")}
                </FieldDescription>
              )}
            </Field>
          );
        })}
      </FieldGroup>
    </FieldSet>
  );
}
