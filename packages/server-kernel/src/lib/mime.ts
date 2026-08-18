/**
 * 存储对象 MIME ↔ 扩展名互转。
 *
 * 存储键（`<id><ext>`）与公开 URL 的最后一段是同一个字符串，写入时按 MIME 定扩展名、
 * 读取时按扩展名反推 MIME，两张表必须严格互逆——否则上传能成功、回读 404。
 */

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
  "font/woff2": ".woff2",
};

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

/** 认不出来返回空串，调用方自己决定回落（通常是 `.bin`）。 */
export function mimeTypeToExtension(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType.trim().toLowerCase()] ?? "";
}

/** 认不出来返回 `application/octet-stream`：浏览器会当附件下载，不会误当脚本执行。 */
export function extensionToMimeType(ext: string): string {
  return (
    EXTENSION_TO_MIME[ext.trim().toLowerCase()] ?? "application/octet-stream"
  );
}
