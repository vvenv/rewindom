import { extname } from "node:path";

import { ValidationError } from "./app-errors.js";
import { extensionToMimeType } from "./mime.js";

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

export interface ImageUploadSource {
  /** 原始文件名；浏览器给不出 MIME 时靠扩展名回落（尤其是 SVG / WebP 拖放）。 */
  filename?: string;
}

export interface ValidatedImageUpload {
  mime_type: string;
  /** **要落盘的就是这份字节**：SVG 已消毒，和传进来的不是同一个 buffer。 */
  buffer: Buffer;
}

const SVG_MIME_TYPE = "image/svg+xml";

/** 浏览器 / OS 常把这些「不算类型」的值塞进 Content-Type，不能当拒绝依据。 */
const UNKNOWN_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "application/xml",
  "text/xml",
  "text/plain",
]);

const MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
  "image/svg": SVG_MIME_TYPE,
  "image/vnd.microsoft.icon": "image/x-icon",
  "image/icon": "image/x-icon",
};

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
  source?: ImageUploadSource,
): Promise<ValidatedImageUpload> {
  if (buffer.byteLength === 0) {
    throw new ValidationError(rules.error_codes.empty);
  }
  if (buffer.byteLength > rules.max_bytes) {
    throw new ValidationError(rules.error_codes.too_large, {
      max_bytes: rules.max_bytes,
    });
  }

  const mime = resolveImageUploadMime(
    buffer,
    mimeType,
    source?.filename,
    rules.allowed_mime_types,
  );
  if (!mime) {
    throw new ValidationError(rules.error_codes.invalid_mime);
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

/**
 * 声明的 MIME、魔数、文件名扩展名三选一，先信魔数（尤其是 SVG——标成 png 也得消毒）。
 *
 * 拖放时 macOS 经常给出空类型或 `text/xml`，只认 Content-Type 会把合法的 svg/webp 挡掉。
 */
export function resolveImageUploadMime(
  buffer: Buffer,
  declaredMime: string,
  filename: string | undefined,
  allowed: readonly string[],
): string | null {
  const sniffed = sniffImageMime(buffer);
  if (sniffed && allowed.includes(sniffed)) {
    return sniffed;
  }

  const declared = canonicalizeImageMime(declaredMime);
  if (declared && !UNKNOWN_MIME_TYPES.has(declared) && allowed.includes(declared)) {
    return declared;
  }

  if (filename) {
    const fromName = canonicalizeImageMime(
      extensionToMimeType(extname(filename)),
    );
    if (fromName && allowed.includes(fromName)) {
      return fromName;
    }
  }

  return null;
}

export function sniffImageMime(buffer: Buffer): string | null {
  if (looksLikeJpeg(buffer)) return "image/jpeg";
  if (looksLikePng(buffer)) return "image/png";
  if (looksLikeGif(buffer)) return "image/gif";
  if (looksLikeWebp(buffer)) return "image/webp";
  if (looksLikeAvif(buffer)) return "image/avif";
  if (looksLikeIco(buffer)) return "image/x-icon";
  if (looksLikeSvg(buffer)) return SVG_MIME_TYPE;
  return null;
}

function canonicalizeImageMime(mimeType: string): string {
  const mime = mimeType.trim().toLowerCase();
  return MIME_ALIASES[mime] ?? mime;
}

function looksLikeJpeg(buffer: Buffer): boolean {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function looksLikePng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47;
}

function looksLikeGif(buffer: Buffer): boolean {
  if (buffer.length < 6) return false;
  const header = buffer.toString("ascii", 0, 6);
  return header === "GIF87a" || header === "GIF89a";
}

function looksLikeWebp(buffer: Buffer): boolean {
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

function looksLikeAvif(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brands = buffer.toString("ascii", 8, Math.min(buffer.length, 32));
  return brands.includes("avif") || brands.includes("avis");
}

function looksLikeIco(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0 &&
    buffer[1] === 0 &&
    buffer[2] === 1 &&
    buffer[3] === 0
  );
}

function looksLikeSvg(buffer: Buffer): boolean {
  const sample = buffer
    .subarray(0, Math.min(buffer.length, 4096))
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();
  if (/^<svg[\s>/]/i.test(sample)) return true;
  return sample.startsWith("<?xml") && /<svg[\s>/]/i.test(sample);
}
