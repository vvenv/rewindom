import { FieldInfoTip } from "@rewindom/module-sdk/client";
import { Field, FieldLabel } from "@rewindom/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { CONTENT_FORMATS, type ContentFormat } from "../../shared/index.js";

interface ContentFormatFieldProps {
  id: string;
  value: ContentFormat;
  onChange: (value: ContentFormat) => void;
  disabled?: boolean;
}

export function ContentFormatField({
  id,
  value,
  onChange,
  disabled,
}: ContentFormatFieldProps) {
  const { t } = useTranslation("content");

  return (
    <Field>
      <FieldLabel htmlFor={id} className="flex items-center gap-1">
        {t("format.label")}
        <FieldInfoTip
          text={`${t("format.noteHint")}\n${t("format.articleHint")}`}
        />
      </FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === "note" || next === "article") {
            onChange(next);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {CONTENT_FORMATS.map((format) => (
            <SelectItem key={format} value={format}>
              {t(`format.${format}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
