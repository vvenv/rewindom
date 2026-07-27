/** UUID-addressed bytes are immutable until soft-delete (404). */
export const ATTACHMENT_CONTENT_CACHE_CONTROL =
  "private, max-age=31536000, immutable";

export function isAttachmentContentRequest(
  method: string,
  url: string,
): boolean {
  if (method !== "GET") {
    return false;
  }
  const path = url.split("?")[0] ?? "";
  return /^\/api\/attachments\/[^/]+\/content\/?$/.test(path);
}
