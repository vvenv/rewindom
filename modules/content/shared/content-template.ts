/**
 * 创作模板（SOP）的字段模型与校验 —— **唯一真相源**，三处共用。
 *
 * 创建表单按它画控件，服务端按它验收提交，生成时按它组装 prompt。分成两份的话，
 * 租户把某个字段改成必填，前端拦了后端没拦（或反过来）——而这类分歧只有在真有人
 * 提交时才会暴露。这条教训直接来自 site-form（见其 `shared/sections/form/fields.ts`）。
 *
 * 刻意**不** import site-form 的那份：它挂在 marketing 的 section schema 与 block
 * 体系上，content 依赖过去等于为了省一个 interface 把两个限界上下文焊死。这里只要
 * 四种字段类型，比表单段薄得多。
 *
 * 校验结果里的 code 是消息 key，本层不含展示文案。
 */

export const CONTENT_FIELD_TYPES = [
  "text",
  "textarea",
  "select",
  "tags",
] as const;

export type ContentFieldType = (typeof CONTENT_FIELD_TYPES)[number];

export const CONTENT_TEMPLATE_NAME_MAX_LENGTH = 80;
export const CONTENT_TEMPLATE_DESCRIPTION_MAX_LENGTH = 200;
export const CONTENT_TEMPLATE_FIELDS_MAX = 16;
export const CONTENT_TEMPLATE_GUIDELINES_MAX_LENGTH = 4_000;
/**
 * 范文有上限且计入 prompt 预算：不设限的话租户会贴一整个专栏进去，
 * token 成本和超窗失败都由平台吃。
 */
export const CONTENT_TEMPLATE_SAMPLES_MAX = 3;
export const CONTENT_SAMPLE_BODY_MAX_LENGTH = 2_000;

export const CONTENT_FIELD_LABEL_MAX_LENGTH = 40;
export const CONTENT_FIELD_OPTIONS_MAX = 24;
/** 单行字段的值上限；多行另算。 */
export const CONTENT_FIELD_VALUE_MAX_LENGTH = 200;
export const CONTENT_FIELD_TEXTAREA_MAX_LENGTH = 4_000;
export const CONTENT_FIELD_TAGS_MAX = 20;

export interface ContentTemplateField {
  /** 字段 id 就是填写时的 key：租户改标签、调顺序都不会让它变。 */
  id: string;
  label: string;
  type: ContentFieldType;
  required: boolean;
  placeholder: string;
  /** 填写指引：写给填表人看的「这一栏该写成什么样」。 */
  help: string;
  /** 仅 `select`：可选项。 */
  options: string[];
}

/**
 * 输出约束：模板作者定「写成什么样」，渲染进 system prompt 的硬要求段。
 *
 * 数值 0 一律表示「不限」——省得为每一项再存一个 enabled 布尔。
 */
export interface ContentOutputRules {
  title_max: number;
  body_min: number;
  body_max: number;
  hashtag_min: number;
  hashtag_max: number;
  /** 语气 / 人称等一句话说明，例：第一人称、像跟朋友分享。 */
  tone: string;
}

export interface ContentTemplateSample {
  title: string;
  body: string;
}

/**
 * 填好的一条：**自描述**，不依赖当时的模板还在不在。
 *
 * 存 `[{ id, label, value }]` 而不是 `{ fieldId: value }` ——租户随时会改标签、
 * 删字段、调顺序，按 id 存的话三个月后回头看只剩一堆对不上任何东西的 uuid，
 * 「这篇当时是按什么填的」就再也说不清了。
 */
export interface ContentBriefEntry {
  id: string;
  label: string;
  value: string;
}

export const EMPTY_OUTPUT_RULES: ContentOutputRules = {
  title_max: 0,
  body_min: 0,
  body_max: 0,
  hashtag_min: 0,
  hashtag_max: 0,
  tone: "",
};

export function isContentFieldType(value: string): value is ContentFieldType {
  return (CONTENT_FIELD_TYPES as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asCount(value: unknown, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), max);
}

/** 字段值的长度上限：多行比单行宽得多，不该共用一个数。 */
export function fieldValueMaxLength(type: ContentFieldType): number {
  return type === "textarea"
    ? CONTENT_FIELD_TEXTAREA_MAX_LENGTH
    : CONTENT_FIELD_VALUE_MAX_LENGTH;
}

/** 标签字段的值是「逗号分隔的一串」，各国标点都收。 */
export function splitTagValue(value: string): string[] {
  return value
    .split(/[,，、\n]/u)
    .map((tag) => tag.replace(/^#/u, "").trim())
    .filter((tag) => tag.length > 0);
}

/**
 * 把库里的 jsonb 读成字段表。
 *
 * 不认识的类型退回单行文本，而不是让整个模板加载不出来——租户存量数据里出现
 * 一个没见过的 type 时，界面该照常能用。
 */
export function normalizeTemplateFields(raw: unknown): ContentTemplateField[] {
  if (!Array.isArray(raw)) return [];
  const fields: ContentTemplateField[] = [];
  const seen = new Set<string>();

  for (const item of raw.slice(0, CONTENT_TEMPLATE_FIELDS_MAX)) {
    const record = asRecord(item);
    if (!record) continue;
    const id = asText(record.id, 64);
    const label = asText(record.label, CONTENT_FIELD_LABEL_MAX_LENGTH);
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);

    const rawType = typeof record.type === "string" ? record.type : "";
    const type: ContentFieldType = isContentFieldType(rawType)
      ? rawType
      : "text";
    const options =
      type === "select" && Array.isArray(record.options)
        ? record.options
            .filter((option): option is string => typeof option === "string")
            .map((option) => option.trim())
            .filter((option) => option.length > 0)
            .slice(0, CONTENT_FIELD_OPTIONS_MAX)
        : [];

    fields.push({
      id,
      label,
      type,
      required: record.required === true,
      placeholder: asText(record.placeholder, CONTENT_FIELD_VALUE_MAX_LENGTH),
      help: asText(record.help, CONTENT_FIELD_VALUE_MAX_LENGTH),
      options,
    });
  }

  return fields;
}

export function normalizeOutputRules(raw: unknown): ContentOutputRules {
  const record = asRecord(raw);
  if (!record) return { ...EMPTY_OUTPUT_RULES };
  return {
    title_max: asCount(record.title_max, 200),
    body_min: asCount(record.body_min, 100_000),
    body_max: asCount(record.body_max, 100_000),
    hashtag_min: asCount(record.hashtag_min, 30),
    hashtag_max: asCount(record.hashtag_max, 30),
    tone: asText(record.tone, CONTENT_FIELD_VALUE_MAX_LENGTH),
  };
}

export function normalizeSamples(raw: unknown): ContentTemplateSample[] {
  if (!Array.isArray(raw)) return [];
  const samples: ContentTemplateSample[] = [];
  for (const item of raw.slice(0, CONTENT_TEMPLATE_SAMPLES_MAX)) {
    const record = asRecord(item);
    if (!record) continue;
    const body = asText(record.body, CONTENT_SAMPLE_BODY_MAX_LENGTH);
    if (!body) continue;
    samples.push({
      title: asText(record.title, CONTENT_TEMPLATE_NAME_MAX_LENGTH),
      body,
    });
  }
  return samples;
}

export function normalizeBriefEntries(raw: unknown): ContentBriefEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: ContentBriefEntry[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;
    const value = asText(record.value, CONTENT_FIELD_TEXTAREA_MAX_LENGTH);
    if (!value) continue;
    entries.push({
      id: asText(record.id, 64),
      label: asText(record.label, CONTENT_FIELD_LABEL_MAX_LENGTH),
      value,
    });
  }
  return entries;
}

export type BriefValidationResult =
  | { ok: true; entries: ContentBriefEntry[] }
  | { ok: false; errors: Record<string, string> };

/**
 * 按字段表验收一次填写。
 *
 * 一次把所有错都给出来，不是一个个挤——填表人不该为了看到第二个错再提交一遍。
 * 空的选填字段直接不入库：留一条空 entry 只会让详情页多一行没内容的标签。
 */
export function validateBriefValues(
  fields: ContentTemplateField[],
  values: Record<string, string>,
): BriefValidationResult {
  const errors: Record<string, string> = {};
  const entries: ContentBriefEntry[] = [];

  for (const field of fields) {
    const value = (values[field.id] ?? "").trim();

    if (!value) {
      if (field.required) {
        errors[field.id] = "content.field.required";
      }
      continue;
    }
    if (value.length > fieldValueMaxLength(field.type)) {
      errors[field.id] = "content.field.too_long";
      continue;
    }
    if (field.type === "select" && !field.options.includes(value)) {
      // 绕过表单构造请求过不来：下拉只收它自己列出来的值
      errors[field.id] = "content.field.option";
      continue;
    }
    if (
      field.type === "tags" &&
      splitTagValue(value).length > CONTENT_FIELD_TAGS_MAX
    ) {
      errors[field.id] = "content.field.too_many_tags";
      continue;
    }

    entries.push({ id: field.id, label: field.label, value });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, entries };
}

/**
 * 把填写拼成纯文本。
 *
 * 两个用途：列表页的关键词搜索（jsonb 里搜不动），以及详情页 / 审计里的可读摘要。
 * 它是**派生值**，永远由 entries 重算，不接受直接写入。
 */
export function composeBriefText(entries: ContentBriefEntry[]): string {
  return entries
    .map((entry) =>
      entry.label ? `${entry.label}：${entry.value}` : entry.value,
    )
    .join("\n");
}
