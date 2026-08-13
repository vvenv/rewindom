import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import type { AppLocale } from "@rewindom/module-sdk";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Switch } from "@rewindom/ui/switch";
import { Textarea } from "@rewindom/ui/textarea";
import { useTranslation } from "react-i18next";

import { patchLocalized, type ProductFormValues } from "../../lib/product-form.js";

export function ProductBasicsFields({
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
        <FieldLabel htmlFor="shop-title">{t("fieldTitle")}</FieldLabel>
        <Input
          id="shop-title"
          value={form.title[contentLocale] ?? ""}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({
              title: patchLocalized(form.title, contentLocale, event.target.value),
            })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-description">{t("fieldDescription")}</FieldLabel>
        <Textarea
          id="shop-description"
          rows={6}
          value={form.description[contentLocale] ?? ""}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({
              description: patchLocalized(
                form.description,
                contentLocale,
                event.target.value,
              ),
            })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-slug" className="flex items-center gap-1">
          {t("fieldSlug")}
          <FieldInfoTip text={t("infoSlug")} side="left" />
        </FieldLabel>
        <Input
          id="shop-slug"
          value={form.slug}
          disabled={!canWrite}
          onChange={(event) => onChange({ slug: event.target.value })}
        />
      </Field>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="shop-published">{t("statusPublished")}</FieldLabel>
        <Switch
          id="shop-published"
          checked={form.status === "published"}
          disabled={!canWrite}
          onCheckedChange={(checked) =>
            onChange({ status: checked ? "published" : "draft" })
          }
        />
      </Field>
    </FieldGroup>
  );
}
