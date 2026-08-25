import { Button } from "@rewindom/ui/button";
import { Checkbox } from "@rewindom/ui/checkbox";
import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Textarea } from "@rewindom/ui/textarea";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  CONTENT_FIELD_TYPES,
  isContentFieldType,
  type ContentTemplateField,
} from "../../shared/index.js";
import {
  newTemplateField,
  optionsFromText,
  optionsToText,
} from "../lib/content-templates.js";

interface ContentTemplateFieldsEditorProps {
  fields: ContentTemplateField[];
  disabled?: boolean;
  onChange: (fields: ContentTemplateField[]) => void;
}

/**
 * 字段表编辑器 —— 模板里「每次要填什么」那一半。
 *
 * 顺序就是填写时的顺序，所以给的是上下移动而不是排序号：让人按填写的思路排，
 * 而不是去心算一列数字。
 */
export function ContentTemplateFieldsEditor({
  fields,
  disabled,
  onChange,
}: ContentTemplateFieldsEditorProps) {
  const { t } = useTranslation("content");

  const patch = (index: number, patchValues: Partial<ContentTemplateField>) => {
    onChange(
      fields.map((field, itemIndex) =>
        itemIndex === index ? { ...field, ...patchValues } : field,
      ),
    );
  };

  const move = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="border-border flex flex-col gap-3 rounded-md border p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder={t("template.fieldLabelPlaceholder")}
              value={field.label}
              disabled={disabled}
              onChange={(event) => patch(index, { label: event.target.value })}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("template.moveUp")}
              disabled={disabled || index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("template.moveDown")}
              disabled={disabled || index === fields.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label={t("template.removeField")}
              disabled={disabled}
              onClick={() =>
                onChange(fields.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`template-field-type-${field.id}`}>
                {t("template.fieldType")}
              </FieldLabel>
              <Select
                value={field.type}
                disabled={disabled}
                onValueChange={(next) => {
                  if (isContentFieldType(next)) {
                    patch(index, { type: next });
                  }
                }}
              >
                <SelectTrigger id={`template-field-type-${field.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {CONTENT_FIELD_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`template.fieldTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field orientation="horizontal" className="sm:self-end">
              <Checkbox
                id={`template-field-required-${field.id}`}
                checked={field.required}
                disabled={disabled}
                onCheckedChange={(checked) =>
                  patch(index, { required: checked === true })
                }
              />
              <FieldLabel htmlFor={`template-field-required-${field.id}`}>
                {t("template.fieldRequired")}
              </FieldLabel>
            </Field>

            <Field>
              <FieldLabel htmlFor={`template-field-placeholder-${field.id}`}>
                {t("template.fieldPlaceholder")}
              </FieldLabel>
              <Input
                id={`template-field-placeholder-${field.id}`}
                value={field.placeholder}
                disabled={disabled}
                onChange={(event) =>
                  patch(index, { placeholder: event.target.value })
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor={`template-field-help-${field.id}`}>
                {t("template.fieldHelp")}
              </FieldLabel>
              <Input
                id={`template-field-help-${field.id}`}
                placeholder={t("template.fieldHelpPlaceholder")}
                value={field.help}
                disabled={disabled}
                onChange={(event) => patch(index, { help: event.target.value })}
              />
            </Field>
          </div>

          {field.type === "select" ? (
            <Field>
              <FieldLabel htmlFor={`template-field-options-${field.id}`}>
                {t("template.fieldOptions")}
              </FieldLabel>
              <Textarea
                id={`template-field-options-${field.id}`}
                className="min-h-20"
                placeholder={t("template.fieldOptionsPlaceholder")}
                value={optionsToText(field.options)}
                disabled={disabled}
                onChange={(event) =>
                  patch(index, { options: optionsFromText(event.target.value) })
                }
              />
            </Field>
          ) : null}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => onChange([...fields, newTemplateField()])}
      >
        <Plus className="size-4" />
        {t("template.addField")}
      </Button>
    </div>
  );
}
