import { FieldInfoTip } from "@rewindom/module-sdk/client";
import { Field, FieldError, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { Textarea } from "@rewindom/ui/textarea";

import type { ContentTemplateField } from "../../shared/index.js";

interface ContentBriefFieldsProps {
  idPrefix: string;
  fields: ContentTemplateField[];
  values: Record<string, string>;
  errors?: Record<string, string>;
  disabled?: boolean;
  onChange: (fieldId: string, value: string) => void;
}

/**
 * 按模板字段表画出创作说明的填写区。
 *
 * 控件按 `type` 选，提示语来自模板作者填的 `help` —— 这一栏「该写成什么样」
 * 是 SOP 的一部分，写在模板里而不是硬编码进界面。
 */
export function ContentBriefFields({
  idPrefix,
  fields,
  values,
  errors,
  disabled,
  onChange,
}: ContentBriefFieldsProps) {
  return (
    <>
      {fields.map((field) => {
        const id = `${idPrefix}-${field.id}`;
        const value = values[field.id] ?? "";
        const error = errors?.[field.id];

        return (
          <Field key={field.id} data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor={id} className="flex items-center gap-1">
              {field.label}
              {field.required ? (
                <span aria-hidden="true" className="text-destructive">
                  *
                </span>
              ) : null}
              {field.help ? <FieldInfoTip text={field.help} /> : null}
            </FieldLabel>

            {field.type === "textarea" ? (
              <Textarea
                id={id}
                className="min-h-24"
                placeholder={field.placeholder}
                value={value}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(field.id, event.target.value)}
              />
            ) : field.type === "select" ? (
              <Select
                value={value}
                disabled={disabled}
                onValueChange={(next) => onChange(field.id, next)}
              >
                <SelectTrigger id={id} aria-invalid={error ? true : undefined}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                placeholder={field.placeholder}
                value={value}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(field.id, event.target.value)}
              />
            )}

            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
        );
      })}
    </>
  );
}
