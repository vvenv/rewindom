import { useId, type ReactElement } from "react";

import { Checkbox } from "@be-water/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@be-water/ui/field";
import { Input } from "@be-water/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@be-water/ui/select";
import { Slider } from "@be-water/ui/slider";
import { Textarea } from "@be-water/ui/textarea";
import { useTranslation } from "react-i18next";

import {
  isInputSetting,
  SECTION_ICON_CHOICES,
  type InputSettingDef,
  type SettingDef,
  type SettingValue,
  type SettingValues,
} from "../../../shared/section-schema.js";
import { SECTION_ICON_COMPONENTS } from "../sections/section-icons.js";

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/u;

interface SettingsFieldsProps {
  defs: SettingDef[];
  values: SettingValues;
  disabled?: boolean;
  onChange: (next: SettingValues) => void;
}

/**
 * 由 schema 渲染整组设置项——编辑器不再为每个 section type 手写表单。
 * 新增 setting 类型只需在此加一个分支 + 在 `section-schema.ts` 声明。
 */
export function SettingsFields({
  defs,
  values,
  disabled,
  onChange,
}: SettingsFieldsProps): ReactElement {
  const { t } = useTranslation("marketing");

  return (
    <FieldGroup>
      {defs.map((def, index) => {
        if (!isInputSetting(def)) {
          return def.type === "header" ? (
            <p
              key={`header-${index}`}
              className="text-xs font-medium tracking-wide text-muted-foreground uppercase not-first:mt-2"
            >
              {t(def.content)}
            </p>
          ) : (
            <p
              key={`paragraph-${index}`}
              className="text-xs text-muted-foreground"
            >
              {t(def.content)}
            </p>
          );
        }

        return (
          <SettingField
            key={def.id}
            def={def}
            value={values[def.id]}
            disabled={disabled}
            onChange={(next) => onChange({ ...values, [def.id]: next })}
          />
        );
      })}
    </FieldGroup>
  );
}

interface SettingFieldProps {
  def: InputSettingDef;
  value: SettingValue | undefined;
  disabled?: boolean;
  onChange: (next: SettingValue) => void;
}

function SettingField({
  def,
  value,
  disabled,
  onChange,
}: SettingFieldProps): ReactElement {
  const { t } = useTranslation("marketing");
  const fieldId = useId();
  const label = t(def.label);
  const info = def.info ? t(def.info) : null;

  if (def.type === "checkbox") {
    return (
      <Field orientation="horizontal">
        <Checkbox
          id={fieldId}
          disabled={disabled}
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
        />
        <div className="flex flex-col gap-1">
          <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
          {info ? <FieldDescription>{info}</FieldDescription> : null}
        </div>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <SettingControl
        def={def}
        fieldId={fieldId}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
      {info ? <FieldDescription>{info}</FieldDescription> : null}
    </Field>
  );
}

function SettingControl({
  def,
  fieldId,
  value,
  disabled,
  onChange,
}: SettingFieldProps & { fieldId: string }): ReactElement | null {
  const { t } = useTranslation("marketing");
  const text = typeof value === "string" ? value : "";

  switch (def.type) {
    case "text":
    case "url":
    case "image":
      return (
        <Input
          id={fieldId}
          disabled={disabled}
          placeholder={def.placeholder}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "textarea":
    case "richtext":
    case "list":
      return (
        <Textarea
          id={fieldId}
          disabled={disabled}
          rows={def.rows ?? (def.type === "richtext" ? 10 : 3)}
          placeholder={def.placeholder}
          className={def.type === "textarea" ? undefined : "font-mono text-xs"}
          value={text}
          onChange={(event) => onChange(event.target.value)}
        />
      );

    case "icon":
      return (
        <Select
          disabled={disabled}
          value={text || SECTION_ICON_CHOICES[0]}
          onValueChange={onChange}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SECTION_ICON_CHOICES.map((name) => {
              const Icon = SECTION_ICON_COMPONENTS[name];
              return (
                <SelectItem key={name} value={name}>
                  <span className="inline-flex items-center gap-2">
                    <Icon className="size-3.5" />
                    {name}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      );

    case "select":
      return (
        <Select
          disabled={disabled}
          value={text || def.default}
          onValueChange={onChange}
        >
          <SelectTrigger id={fieldId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "range": {
      const current = typeof value === "number" ? value : def.default;
      // 可继承的滑块把最左一格留给「继承」，读数处显示文字而不是负数
      const inherited = def.allow_inherit === true && current < 0;
      return (
        <div className="flex items-center gap-3">
          <Slider
            id={fieldId}
            disabled={disabled}
            className="flex-1"
            min={def.min}
            max={def.max}
            step={def.step}
            value={[current]}
            onValueChange={([next]) => onChange(next ?? def.default)}
          />
          <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {inherited
              ? t("editor.inherit")
              : def.unit
                ? `${current} ${t(def.unit)}`
                : current}
          </span>
        </div>
      );
    }

    case "color": {
      // 输入框允许中途非法值；只有合法 hex 才同步给取色器，避免闪回。
      const swatch = HEX_RE.test(text) ? expandHex(text) : def.default;
      return (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            aria-label={t(def.label)}
            disabled={disabled}
            className="h-9 w-12 shrink-0 cursor-pointer p-1"
            value={swatch}
            onChange={(event) => onChange(event.target.value)}
          />
          <Input
            id={fieldId}
            disabled={disabled}
            placeholder={def.default}
            value={text}
            onChange={(event) => onChange(event.target.value.trim())}
          />
        </div>
      );
    }

    default:
      return null;
  }
}

function expandHex(hex: string): string {
  if (hex.length !== 4) return hex;
  const [, r, g, b] = hex;
  return `#${r}${r}${g}${g}${b}${b}`;
}
