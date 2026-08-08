export const BOOKMARK_TITLE_MAX_LENGTH = 200;
export const BOOKMARK_URL_MAX_LENGTH = 2048;
export const BOOKMARK_DESCRIPTION_MAX_LENGTH = 2000;
export const BOOKMARK_PREVIEW_MAX_LENGTH = 120;

export interface BookmarkInput {
  url?: string;
  title?: string;
  description?: string;
}

export interface BookmarkValidationIssue {
  code:
    | "bookmark.url_required"
    | "bookmark.url_too_long"
    | "bookmark.title_required"
    | "bookmark.title_too_long"
    | "bookmark.description_too_long";
  params?: Record<string, number>;
}

export function buildDescriptionPreview(description: string): string {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= BOOKMARK_PREVIEW_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, BOOKMARK_PREVIEW_MAX_LENGTH)}…`;
}

export function validateBookmarkInput(
  input: BookmarkInput,
  options: { requireTitle?: boolean } = {},
): BookmarkValidationIssue | null {
  const requireTitle = options.requireTitle ?? true;

  if (input.url !== undefined) {
    const url = input.url.trim();
    if (!url) {
      return { code: "bookmark.url_required" };
    }
    if (url.length > BOOKMARK_URL_MAX_LENGTH) {
      return { code: "bookmark.url_too_long", params: { max: BOOKMARK_URL_MAX_LENGTH } };
    }
  }

  if (requireTitle) {
    const title = input.title?.trim() ?? "";
    if (!title) {
      return { code: "bookmark.title_required" };
    }
    if (title.length > BOOKMARK_TITLE_MAX_LENGTH) {
      return { code: "bookmark.title_too_long", params: { max: BOOKMARK_TITLE_MAX_LENGTH } };
    }
  } else if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) {
      return { code: "bookmark.title_required" };
    }
    if (title.length > BOOKMARK_TITLE_MAX_LENGTH) {
      return { code: "bookmark.title_too_long", params: { max: BOOKMARK_TITLE_MAX_LENGTH } };
    }
  }

  if (input.description !== undefined && input.description.length > BOOKMARK_DESCRIPTION_MAX_LENGTH) {
    return { code: "bookmark.description_too_long", params: { max: BOOKMARK_DESCRIPTION_MAX_LENGTH } };
  }

  return null;
}
