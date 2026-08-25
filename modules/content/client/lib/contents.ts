import {
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  fieldValueMaxLength,
  validateBriefValues,
  type ContentBriefEntry,
  type ContentFormat,
  type ContentStatus,
  type ContentTemplateField,
} from "../../shared/index.js";

export const CONTENT_TITLE_MAX_LENGTH = 200;
export const CONTENT_BODY_MAX_LENGTH = 80_000;
export const CONTENT_TEXT_ASSET_MAX_LENGTH = 20_000;
export const CONTENT_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp,.gif";

export interface ContentFormValues {
  title: string;
  body: string;
  format: ContentFormat;
  template_id: string | null;
  /** 按模板字段 id 存的当前输入；提交时原样送后端，由它按模板再验一遍。 */
  values: Record<string, string>;
}

export const INITIAL_CONTENT_FORM: ContentFormValues = {
  title: "",
  body: "",
  format: "note",
  template_id: null,
  values: {},
};

type ContentTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function validateContentForm(
  values: ContentFormValues,
  t: ContentTranslate,
): string | null {
  if (values.title.length > CONTENT_TITLE_MAX_LENGTH) {
    return t("validation.titleTooLong", { max: CONTENT_TITLE_MAX_LENGTH });
  }
  if (values.body.length > CONTENT_BODY_MAX_LENGTH) {
    return t("validation.bodyTooLong", { max: CONTENT_BODY_MAX_LENGTH });
  }
  return null;
}

/**
 * 按模板字段校验一次填写，返回逐字段的中文提示。
 *
 * 校验本身调 shared 的 `validateBriefValues` ——与服务端同一份口径，这里只负责
 * 把 code 翻成人话。两边各写一套的话，租户把某个字段改成必填，前端拦了后端没拦
 * （或反过来）只有在真有人提交时才会暴露。
 */
export function validateBriefForm(
  fields: ContentTemplateField[],
  values: Record<string, string>,
  t: ContentTranslate,
): Record<string, string> {
  const result = validateBriefValues(fields, values);
  if (result.ok) return {};
  return Object.fromEntries(
    Object.entries(result.errors).map(([id, code]) => {
      const field = fields.find((item) => item.id === id);
      return [
        id,
        t(`fieldError.${code.slice("content.field.".length)}`, {
          field: field?.label ?? id,
          max: field ? fieldValueMaxLength(field.type) : 0,
        }),
      ];
    }),
  );
}

/** 详情页打开时，把存下来的填写记录还原成表单的当前值。 */
export function briefEntriesToValues(
  entries: ContentBriefEntry[],
): Record<string, string> {
  return Object.fromEntries(entries.map((entry) => [entry.id, entry.value]));
}

/** 有没有东西可生成：填了任意一栏，或挂了素材。 */
export function hasBriefInput(values: Record<string, string>): boolean {
  return Object.values(values).some((value) => value.trim().length > 0);
}

export function buildContentPayload(values: ContentFormValues): {
  title: string;
  body: string;
  format: ContentFormat;
  template_id: string | null;
  brief_values: Record<string, string>;
} {
  return {
    title: values.title.trim(),
    body: values.body.trim(),
    format: values.format,
    template_id: values.template_id,
    brief_values: values.values,
  };
}

export function isContentFormatValue(value: string): value is ContentFormat {
  return (CONTENT_FORMATS as readonly string[]).includes(value);
}

export function isContentStatusValue(value: string): value is ContentStatus {
  return (CONTENT_STATUSES as readonly string[]).includes(value);
}

export function displayContentTitle(
  title: string,
  t: ContentTranslate,
): string {
  const trimmed = title.trim();
  return trimmed || t("untitled");
}

export function translateContentError(
  code: string | null | undefined,
  t: ContentTranslate,
): string | null {
  if (!code) return null;
  if (code.startsWith("content.")) {
    const key = `error.${code.slice("content.".length)}`;
    const translated = t(key);
    return translated === key ? t("error.generate_failed") : translated;
  }
  return code;
}
