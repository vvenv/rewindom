import { isContentFormat, type ContentFormat } from "../shared/index.js";

export const CONTENT_TITLE_MAX_LENGTH = 200;
export const CONTENT_BODY_MAX_LENGTH = 80_000;
export const CONTENT_TEXT_ASSET_MAX_LENGTH = 20_000;
export const CONTENT_ASSETS_MAX = 12;
export const CONTENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CONTENT_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
export const CONTENT_PREVIEW_LENGTH = 80;
export const CONTENT_STALE_GENERATING_MS = 15 * 60 * 1000;

export const CONTENT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const CONTENT_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export interface ContentInput {
  title?: string;
  body?: string;
  format?: string;
}

export interface ContentValidationIssue {
  code: string;
  params?: Record<string, number>;
}

export function parseContentFormat(
  value: string | undefined,
): ContentFormat | null {
  if (value === undefined) {
    return "note";
  }
  return isContentFormat(value) ? value : null;
}

export function validateContentInput(
  input: ContentInput,
  options: { partial?: boolean } = {},
): ContentValidationIssue | null {
  const partial = options.partial ?? false;

  if (!partial || input.title !== undefined) {
    const title = input.title?.trim() ?? "";
    if (title.length > CONTENT_TITLE_MAX_LENGTH) {
      return {
        code: "content.title_too_long",
        params: { max: CONTENT_TITLE_MAX_LENGTH },
      };
    }
  }

  if (!partial || input.body !== undefined) {
    const body = input.body?.trim() ?? "";
    if (body.length > CONTENT_BODY_MAX_LENGTH) {
      return {
        code: "content.body_too_long",
        params: { max: CONTENT_BODY_MAX_LENGTH },
      };
    }
  }

  if (!partial || input.format !== undefined) {
    if (parseContentFormat(input.format) === null) {
      return { code: "content.invalid_format" };
    }
  }

  return null;
}

export function buildContentPreview(text: string): string {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (normalized.length <= CONTENT_PREVIEW_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, CONTENT_PREVIEW_LENGTH)}…`;
}

export function contentAssetObjectKey(
  tenantId: string,
  contentId: string,
  assetId: string,
  ext: string,
): string {
  return `${tenantId}/contents/${contentId}/${assetId}${ext}`;
}
