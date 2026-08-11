import { ValidationError } from "./app-errors.js";

export interface ImageUploadRules {
  allowed_mime_types: readonly string[];
  max_bytes: number;
  /** 各业务域的 i18n 错误码不同，由调用方给。 */
  error_codes: {
    invalid_mime: string;
    empty: string;
    too_large: string;
    /** SVG 消毒后不剩一份可用的图。 */
    unsafe_svg: string;
  };
}

export interface ValidatedImageUpload {
  mime_type: string;
  /** **要落盘的就是这份字节**：SVG 已消毒，和传进来的不是同一个 buffer。 */
  buffer: Buffer;
}

const SVG_MIME_TYPE = "image/svg+xml";

/**
 * 图片上传的统一准入校验：白名单 + 大小 + 规范化 MIME + SVG 消毒。
 *
 * 收在一处是为了让「什么算一张可接受的图片」只有一个答案：媒体库与品牌资源
 * 各自维护一套规则时，两边迟早会漂移——尤其是 SVG 这种一处漏掉就等于开了个 XSS 口子的。
 *
 * 返回值里的 `buffer` 才是该存的字节，别再用调用方原来那份。
 */
export async function validateImageUpload(
  buffer: Buffer,
  mimeType: string,
  rules: ImageUploadRules,
): Promise<ValidatedImageUpload> {
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

  if (mime !== SVG_MIME_TYPE) {
    return { mime_type: mime, buffer };
  }

  // 按需加载：jsdom 不便宜，多数部署一次 SVG 都不会传，不该进启动路径
  const { sanitizeSvg } = await import("./svg-sanitize.js");
  const clean = sanitizeSvg(buffer.toString("utf8"));
  if (!clean) {
    throw new ValidationError(rules.error_codes.unsafe_svg);
  }
  return { mime_type: mime, buffer: Buffer.from(clean, "utf8") };
}
