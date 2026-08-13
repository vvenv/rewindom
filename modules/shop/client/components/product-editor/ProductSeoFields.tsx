import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import type { AppLocale } from "@rewindom/module-sdk";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Textarea } from "@rewindom/ui/textarea";
import { useTranslation } from "react-i18next";

import { patchLocalized, type ProductFormValues } from "../../lib/product-form.js";

export function ProductSeoFields({
  form,
  contentLocale,
  canWrite,
  onChange,
}: {
  form: ProductFormValues;
  contentLocale: AppLocale;
  canWrite: boolean;
  onChange: (partial: Partial<ProductFormValues>) => void;
}): ReactElement {
  const { t } = useTranslation("shop");
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="shop-seo-title" className="flex items-center gap-1">
          {t("fieldSeoTitle")}
          <FieldInfoTip text={t("infoSeoTitle")} side="left" />
        </FieldLabel>
        <Input
          id="shop-seo-title"
          value={form.seo_title[contentLocale] ?? ""}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({
              seo_title: patchLocalized(
                form.seo_title,
                contentLocale,
                event.target.value,
              ),
            })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-seo-description" className="flex items-center gap-1">
          {t("fieldSeoDescription")}
          <FieldInfoTip text={t("infoSeoDescription")} side="left" />
        </FieldLabel>
        <Textarea
          id="shop-seo-description"
          rows={3}
          value={form.seo_description[contentLocale] ?? ""}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({
              seo_description: patchLocalized(
                form.seo_description,
                contentLocale,
                event.target.value,
              ),
            })
          }
        />
      </Field>
    </FieldGroup>
  );
}
