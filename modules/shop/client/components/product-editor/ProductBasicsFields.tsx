import type { ReactElement } from "react";

import { FieldInfoTip } from "@rewindom/module-sdk/client";
import type { AppLocale } from "@rewindom/module-sdk";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

import { patchLocalized, type ProductFormValues } from "../../lib/product-form.js";
import type { ShopProductStatus } from "../../../shared/product-commerce.js";

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
        <FieldLabel htmlFor="shop-subtitle" className="flex items-center gap-1">
          {t("fieldSubtitle")}
          <FieldInfoTip text={t("infoSubtitle")} side="left" />
        </FieldLabel>
        <Input
          id="shop-subtitle"
          value={form.subtitle[contentLocale] ?? ""}
          disabled={!canWrite}
          onChange={(event) =>
            onChange({
              subtitle: patchLocalized(
                form.subtitle,
                contentLocale,
                event.target.value,
              ),
            })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="shop-description" className="flex items-center gap-1">
          {t("fieldDescription")}
          <FieldInfoTip text={t("infoDescription")} side="left" />
        </FieldLabel>
        <div className={canWrite ? undefined : "pointer-events-none opacity-70"}>
          <MDEditor
            value={form.description[contentLocale] ?? ""}
            height={280}
            visibleDragbar={false}
            preview="edit"
            data-color-mode={resolvedTheme === "dark" ? "dark" : "light"}
            textareaProps={{
              id: "shop-description",
              placeholder: t("descriptionPlaceholder"),
              disabled: !canWrite,
            }}
            onChange={(value) =>
              onChange({
                description: patchLocalized(
                  form.description,
                  contentLocale,
                  value ?? "",
                ),
              })
            }
          />
        </div>
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
      <Field>
        <FieldLabel>{t("fieldStatus")}</FieldLabel>
        <Select
          value={form.status}
          disabled={!canWrite}
          onValueChange={(value) => {
            if (!value) return;
            onChange({ status: value as ShopProductStatus });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="draft">{t("statusDraft")}</SelectItem>
            <SelectItem value="published">{t("statusPublished")}</SelectItem>
            <SelectItem value="archived">{t("statusArchived")}</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  );
}
