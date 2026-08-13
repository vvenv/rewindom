import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import type { AppLocale } from "@rewindom/module-sdk";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Switch } from "@rewindom/ui/switch";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { useTheme } from "next-themes";
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
  const { resolvedTheme } = useTheme();
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
        <FieldLabel htmlFor="shop-description" className="flex items-center gap-1">
          {t("fieldDescription")}
          <FieldInfoTip text={t("infoDescription")} side="left" />
        </FieldLabel>
        <MDEditor
          key={contentLocale}
          value={form.description[contentLocale] ?? ""}
          height={360}
          visibleDragbar={false}
          preview={canWrite ? "edit" : "preview"}
          hideToolbar={!canWrite}
          data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
          textareaProps={{
            // id 挂在真正的 textarea 上，label 才点得动（挂在 MDEditor
            // 上只会落到外层 div）
            id: "shop-description",
            placeholder: t("descriptionPlaceholder"),
            disabled: !canWrite,
          }}
          onChange={(value) => {
            if (!canWrite) return;
            onChange({
              description: patchLocalized(
                form.description,
                contentLocale,
                value ?? "",
              ),
            });
          }}
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
