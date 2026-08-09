import { Field, FieldError, FieldGroup, FieldLabel } from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";

import { guessBookmarkHost } from "../lib/bookmarks.js";

import type { BookmarkFormValues } from "../lib/bookmarks.js";

interface BookmarkFormFieldsProps {
  /** 拼进各 input 的 id，避免同页出现两个表单时 label 指错控件。 */
  idPrefix: string;
  values: BookmarkFormValues;
  error: string;
  onChange: (values: BookmarkFormValues) => void;
}

/**
 * 新建与编辑两张表单的共用字段。
 *
 * 标题的 placeholder 跟着 URL 走：留空时会存成主机名，
 * 直接把这个结果显示出来，比一句「可选」更说明问题。
 */
export function BookmarkFormFields({
  idPrefix,
  values,
  error,
  onChange,
}: BookmarkFormFieldsProps) {
  const { t } = useTranslation("bookmark");
  const host = guessBookmarkHost(values.url);

  return (
    <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-url`}>{t("fieldUrl")}</FieldLabel>
        <Input
          id={`${idPrefix}-url`}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder={t("urlPlaceholder")}
          value={values.url}
          onChange={(event) => onChange({ ...values, url: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-title`}>{t("fieldTitle")}</FieldLabel>
        <Input
          id={`${idPrefix}-title`}
          placeholder={host || t("titlePlaceholder")}
          value={values.title}
          onChange={(event) =>
            onChange({ ...values, title: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-description`}>
          {t("fieldDescription")}
        </FieldLabel>
        <Textarea
          id={`${idPrefix}-description`}
          className="min-h-28"
          placeholder={t("descriptionPlaceholder")}
          value={values.description}
          onChange={(event) =>
            onChange({ ...values, description: event.target.value })
          }
        />
      </Field>
      {error ? <FieldError>{error}</FieldError> : null}
    </FieldGroup>
  );
}
