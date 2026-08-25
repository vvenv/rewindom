import {
  CONTENT_FORMATS,
  CONTENT_STATUSES,
  type ContentFormat,
  type ContentStatus,
} from "../../shared/index.js";

export const CONTENT_TITLE_MAX_LENGTH = 200;
export const CONTENT_BRIEF_MAX_LENGTH = 8_000;
export const CONTENT_BODY_MAX_LENGTH = 80_000;
export const CONTENT_TEXT_ASSET_MAX_LENGTH = 20_000;
export const CONTENT_UPLOAD_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp,.gif";

export interface ContentFormValues {
  title: string;
  brief: string;
  body: string;
  format: ContentFormat;
}

export const INITIAL_CONTENT_FORM: ContentFormValues = {
  title: "",
  brief: "",
  body: "",
  format: "note",
};

type ContentTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function validateContentForm(
  values: ContentFormValues,
  t: ContentTranslate,
  options: { requireSource?: boolean } = {},
): string | null {
  if (values.title.length > CONTENT_TITLE_MAX_LENGTH) {
    return t("validation.titleTooLong", { max: CONTENT_TITLE_MAX_LENGTH });
  }
  if (values.brief.length > CONTENT_BRIEF_MAX_LENGTH) {
    return t("validation.briefTooLong", { max: CONTENT_BRIEF_MAX_LENGTH });
  }
  if (values.body.length > CONTENT_BODY_MAX_LENGTH) {
    return t("validation.bodyTooLong", { max: CONTENT_BODY_MAX_LENGTH });
  }
  if (options.requireSource && !values.brief.trim()) {
    return t("validation.sourceRequired");
  }
  return null;
}

export function buildContentPayload(values: ContentFormValues): {
  title: string;
  brief: string;
  body: string;
  format: ContentFormat;
} {
  return {
    title: values.title.trim(),
    brief: values.brief.trim(),
    body: values.body.trim(),
    format: values.format,
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
