import { ValidationError } from "./app-errors.js";

export interface ImageUploadRules {
  allowed_mime_types: readonly string[];
  max_bytes: number;
  /** 各业务域的 i18n 错误码不同，由调用方给。 */
  error_codes: {
    invalid_mime: string;
    empty: string;
    too_large: string;
  };
}

/**
 * 图片上传的统一准入校验，返回规范化（trim + 小写）后的 MIME。
 *
 * 收在一处是为了让「什么算一张可接受的图片」只有一个答案：媒体库与品牌资源
 * 各自维护一套白名单时，两边迟早会漂移。后续要加的内容嗅探、SVG 消毒也落在这里。
 */
export function validateImageUpload(
  buffer: Buffer,
  mimeType: string,
  rules: ImageUploadRules,
): string {
  const mime = mimeType.trim().toLowerCase();
  if (!rules.allowed_mime_types.includes(mime)) {
    throw new ValidationError(rules.error_codes.invalid_mime);
  }
  if (buffer.byteLength === 0) {
    throw new ValidationError(rules.error_codes.empty);
  }
  if (buffer.byteLength > rules.max_bytes) {
    throw new ValidationError(rules.error_codes.too_large, {
      max_bytes: rules.max_bytes,
    });
  }
  return mime;
}
