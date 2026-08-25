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

import type { ContentTemplateListItem } from "../../shared/index.js";

/** 「不用模板」在 Select 里的值：Radix 的 SelectItem 不收空字符串。 */
const NO_TEMPLATE = "__none__";

interface ContentTemplatePickerProps {
  id: string;
  templates: ContentTemplateListItem[];
  value: string | null;
  disabled?: boolean;
  onChange: (templateId: string | null) => void;
}

/**
 * 选创作模板。
 *
 * 一个模板都没有时整块不渲染——那时选择器只会摆出一个「不用模板」的空下拉，
 * 徒增一步。租户建了第一个模板它才出现。
 */
export function ContentTemplatePicker({
  id,
  templates,
  value,
  disabled,
  onChange,
}: ContentTemplatePickerProps) {
  const { t } = useTranslation("content");
  if (templates.length === 0) return null;

  return (
    <Field>
      <FieldLabel htmlFor={id} className="flex items-center gap-1">
        {t("template.field")}
        <FieldInfoTip text={t("template.fieldTip")} />
      </FieldLabel>
      <Select
        value={value ?? NO_TEMPLATE}
        disabled={disabled}
        onValueChange={(next) => onChange(next === NO_TEMPLATE ? null : next)}
      >
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={NO_TEMPLATE}>{t("template.none")}</SelectItem>
          {templates.map((template) => (
            <SelectItem key={template.id} value={template.id}>
              {template.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
