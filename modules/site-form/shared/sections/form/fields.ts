/**
 * 表单段的字段模型与校验 —— **唯一真相源**，三处共用。
 *
 * 两端渲染按它画控件，服务端按它验收提交。分成两份的话，租户把某个字段改成必填，
 * 前端拦了后端没拦（或反过来）——而这类分歧只有在真有人提交时才会暴露。
 *
 * 校验结果里的 code 是消息 key（见 `messages.ts`），本层不含展示文案。
 */

import {
  settingBool,
  settingLines,
  settingNumber,
  settingText,
} from "@rewindom/builtin/marketing/shared/section-settings.js";

import type { SiteSection } from "@rewindom/builtin/marketing/shared/sections/types.js";

export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "checkbox",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/**
 * 内置校验规则：在字段类型自带的校验之外，租户可再选一条。
 *
 * `email` / `tel` 也列在这里——虽然选对应字段类型时已自带校验，但租户在「校验规则」
 * 下拉里能直接看到它们才符合直觉，不必让人先去改字段类型。
 */
export const FORM_VALIDATION_RULES = [
  "none",
  "email",
  "tel",
  "url",
  "number",
  "integer",
  "id_card",
  "postal_code",
  "regex",
] as const;

export type FormValidationRule = (typeof FORM_VALIDATION_RULES)[number];

/** 只做「长得像不像」的校验：真要确认得发验证邮件，那是另一件事。 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
/** 数字、空格与 `+ - ( )`，覆盖各国写法，不强求格式。 */
const TEL_RE = /^[+０-９0-9][0-9\s\-()]{4,}$/u;

/** 内置规则的形状校验正则：只做「长得像不像」，不验真伪。 */
const VALIDATION_PATTERNS: Partial<
  Record<Exclude<FormValidationRule, "none" | "regex">, RegExp>
> = {
  email: EMAIL_RE,
  tel: TEL_RE,
  url: /^https?:\/\/\S+$/i,
  number: /^-?\d+(?:\.\d+)?$/,
  integer: /^-?\d+$/,
  id_card: /^\d{17}[\dXx]$/,
  postal_code: /^\d{6}$/,
};

export interface FormField {
  /** block id 就是提交时的 key：租户改标签、调顺序都不会让它变。 */
  id: string;
  label: string;
  type: FormFieldType;
  placeholder: string;
  required: boolean;
  /** 仅 `select`：可选项（一行一个）。 */
  options: string[];
  /** 窄屏永远一列；桌面上这一项要不要独占一行。 */
  wide: boolean;
  /** 额外格式校验规则；`none` = 不校验。 */
  validation: FormValidationRule;
  /** `validation === "regex"` 时用的自定义正则（不带定界符）。 */
  pattern: string;
  /** 自定义最小长度；0 = 不限。 */
  minLength: number;
  /** 自定义最大长度；0 = 跟随类型上限（单行 200 / 多行 4000）。 */
  maxLength: number;
}

/** 存进库的一条：自描述，不依赖当时的 schema 还在不在。 */
export interface FormEntry {
  id: string;
  label: string;
  value: string;
}

/**
 * 单行字段的上限。够长到不影响正常填写，短到不会被当成免费存储空间用。
 * 多行字段单独放宽——「留言」本来就该能写几段。
 */
const MAX_LEN = 200;
const MAX_TEXTAREA_LEN = 4000;

function resolveFieldType(raw: string): FormFieldType {
  return (FORM_FIELD_TYPES as readonly string[]).includes(raw)
    ? (raw as FormFieldType)
    : "text";
}

function resolveValidationRule(raw: string): FormValidationRule {
  return (FORM_VALIDATION_RULES as readonly string[]).includes(raw)
    ? (raw as FormValidationRule)
    : "none";
}

/** 段里的 `field` block → 归一化后的字段表（两端渲染 + 服务端校验共用）。 */
export function resolveFormFields(section: SiteSection): FormField[] {
  return section.blocks
    .filter((block) => block.type === "field")
    .map((block) => {
      const s = block.settings;
      const type = resolveFieldType(settingText(s, "type"));
      return {
        id: block.id,
        label: settingText(s, "label"),
        type,
        placeholder: settingText(s, "placeholder"),
        required: settingBool(s, "required"),
        options: type === "select" ? settingLines(s, "options") : [],
        // 多行字段独占一行是通例，不必让租户每次自己勾
        wide: type === "textarea" || settingBool(s, "wide"),
        validation: resolveValidationRule(settingText(s, "validation")),
        pattern: settingText(s, "pattern"),
        minLength: settingNumber(s, "min_length", 0),
        maxLength: settingNumber(s, "max_length", 0),
      };
    });
}

export type FormValues = Record<string, unknown>;

export type FormValidation =
  | { ok: true; entries: FormEntry[] }
  /** blockId → i18n key。一次把所有错都给出来，不要挤牙膏式地一个个报。 */
  | { ok: false; errors: Record<string, string> };

function normalizeValue(field: FormField, raw: unknown): string {
  if (field.type === "checkbox") {
    return raw === true || raw === "true" || raw === "on" ? "true" : "";
  }
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
  return "";
}

function fieldError(field: FormField, value: string): string | null {
  if (!value) {
    // 勾选框的「必填」就是「必须勾上」（同意条款那种）
    return field.required ? "site.form.required" : null;
  }
  // 长度约束：租户自定义的上下限优先，但不能突破类型硬上限
  if (field.minLength > 0 && value.length < field.minLength) {
    return "site.form.too_short";
  }
  const hardMax = field.type === "textarea" ? MAX_TEXTAREA_LEN : MAX_LEN;
  const effectiveMax =
    field.maxLength > 0 ? Math.min(field.maxLength, hardMax) : hardMax;
  if (value.length > effectiveMax) return "site.form.too_long";
  // 类型自带的格式校验
  if (field.type === "email" && !EMAIL_RE.test(value)) return "site.form.email";
  if (field.type === "tel" && !TEL_RE.test(value)) return "site.form.tel";
  // 下拉只接受它自己列出来的值，不然就是绕过表单直接构造的请求
  if (field.type === "select" && !field.options.includes(value)) {
    return "site.form.option";
  }
  // 额外格式校验规则
  if (field.validation === "regex" && field.pattern) {
    try {
      if (!new RegExp(field.pattern).test(value)) return "site.form.regex";
    } catch {
      // 租户填了非法正则：当作不匹配，而不是让整段校验崩掉
      return "site.form.regex";
    }
  } else if (field.validation !== "none" && field.validation !== "regex") {
    const re = VALIDATION_PATTERNS[field.validation];
    if (re && !re.test(value)) return `site.form.${field.validation}`;
  }
  return null;
}

/**
 * 校验一次提交，通过则给出可以直接入库的条目。
 *
 * 空值的可选字段**不入库**：存一堆空字符串只会让后台列表更难读。
 */
export function validateFormValues(
  fields: FormField[],
  values: FormValues,
): FormValidation {
  const errors: Record<string, string> = {};
  const entries: FormEntry[] = [];

  for (const field of fields) {
    const value = normalizeValue(field, values[field.id]);
    const error = fieldError(field, value);
    if (error) {
      errors[field.id] = error;
      continue;
    }
    if (value) entries.push({ id: field.id, label: field.label, value });
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, entries };
}
