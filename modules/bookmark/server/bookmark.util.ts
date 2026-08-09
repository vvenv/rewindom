export const BOOKMARK_TITLE_MAX_LENGTH = 200;
export const BOOKMARK_URL_MAX_LENGTH = 2048;
export const BOOKMARK_DESCRIPTION_MAX_LENGTH = 2000;
export const BOOKMARK_PREVIEW_MAX_LENGTH = 120;

/** 书签只收 web 链接：`javascript:` / `data:` 一类的 scheme 存进去就是个 XSS 跳板。 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export interface BookmarkInput {
  url?: string;
  title?: string;
  description?: string;
}

export interface BookmarkValidationIssue {
  code:
    | "bookmark.url_required"
    | "bookmark.url_invalid"
    | "bookmark.url_too_long"
    | "bookmark.title_required"
    | "bookmark.title_too_long"
    | "bookmark.description_too_long";
  params?: Record<string, number>;
}

/**
 * 用户多半只会粘 `example.com`。缺 scheme 时补 `https://` 再解析，
 * 顺带丢掉尾随空白与末尾的 `#`——否则同一个站点会存出好几条看起来一样的记录。
 * 返回 null 表示不是一个能用的 http(s) 链接。
 */
export function normalizeBookmarkUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol) || !parsed.hostname) {
    return null;
  }

  const normalized = parsed.toString();
  return normalized.endsWith("#") ? normalized.slice(0, -1) : normalized;
}

/** 卡片上显示的站点名：去掉 `www.` 前缀与端口，解析不了就给空串。 */
export function extractBookmarkHost(url: string): string {
  const normalized = normalizeBookmarkUrl(url);
  if (!normalized) {
    return "";
  }
  return new URL(normalized).hostname.replace(/^www\./, "");
}

export function buildDescriptionPreview(description: string): string {
  const normalized = description.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= BOOKMARK_PREVIEW_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, BOOKMARK_PREVIEW_MAX_LENGTH)}…`;
}

function validateTitle(title: string): BookmarkValidationIssue | null {
  if (!title) {
    return { code: "bookmark.title_required" };
  }
  if (title.length > BOOKMARK_TITLE_MAX_LENGTH) {
    return {
      code: "bookmark.title_too_long",
      params: { max: BOOKMARK_TITLE_MAX_LENGTH },
    };
  }
  return null;
}

export function validateBookmarkInput(
  input: BookmarkInput,
  options: { requireUrl?: boolean; requireTitle?: boolean } = {},
): BookmarkValidationIssue | null {
  const requireUrl = options.requireUrl ?? true;
  const requireTitle = options.requireTitle ?? true;

  if (requireUrl || input.url !== undefined) {
    const url = input.url?.trim() ?? "";
    if (!url) {
      return { code: "bookmark.url_required" };
    }
    if (url.length > BOOKMARK_URL_MAX_LENGTH) {
      return {
        code: "bookmark.url_too_long",
        params: { max: BOOKMARK_URL_MAX_LENGTH },
      };
    }
    if (!normalizeBookmarkUrl(url)) {
      return { code: "bookmark.url_invalid" };
    }
  }

  if (requireTitle || input.title !== undefined) {
    const issue = validateTitle(input.title?.trim() ?? "");
    if (issue) {
      return issue;
    }
  }

  if (
    input.description !== undefined &&
    input.description.length > BOOKMARK_DESCRIPTION_MAX_LENGTH
  ) {
    return {
      code: "bookmark.description_too_long",
      params: { max: BOOKMARK_DESCRIPTION_MAX_LENGTH },
    };
  }

  return null;
}
