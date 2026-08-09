export const BOOKMARK_TITLE_MAX_LENGTH = 200;
export const BOOKMARK_URL_MAX_LENGTH = 2048;
export const BOOKMARK_DESCRIPTION_MAX_LENGTH = 2000;

/** 与 server/bookmark.util.ts 的 ALLOWED_PROTOCOLS 一致。 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export interface BookmarkFormValues {
  url: string;
  title: string;
  description: string;
}

export const INITIAL_BOOKMARK_FORM: BookmarkFormValues = {
  url: "",
  title: "",
  description: "",
};

type BookmarkTranslate = (
  key: string,
  options?: Record<string, unknown>,
) => string;

/**
 * 与服务端 `normalizeBookmarkUrl` 同口径的前端副本：缺 scheme 补 `https://`。
 * 前端先归一是为了「粘 example.com 也能提交」并即时给出主机名，
 * 真正落库的仍是服务端归一后的结果。
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

/** 从输入框里的原始文本取主机名（去 `www.`），取不到给空串。 */
export function guessBookmarkHost(raw: string): string {
  const normalized = normalizeBookmarkUrl(raw);
  if (!normalized) {
    return "";
  }
  return new URL(normalized).hostname.replace(/^www\./, "");
}

export function validateBookmarkForm(
  values: BookmarkFormValues,
  t: BookmarkTranslate,
): string | null {
  const url = values.url.trim();
  if (!url) {
    return t("validation.urlRequired");
  }
  if (url.length > BOOKMARK_URL_MAX_LENGTH) {
    return t("validation.urlTooLong", { max: BOOKMARK_URL_MAX_LENGTH });
  }
  if (!normalizeBookmarkUrl(url)) {
    return t("validation.urlInvalid");
  }
  if (values.title.trim().length > BOOKMARK_TITLE_MAX_LENGTH) {
    return t("validation.titleTooLong", { max: BOOKMARK_TITLE_MAX_LENGTH });
  }
  if (values.description.length > BOOKMARK_DESCRIPTION_MAX_LENGTH) {
    return t("validation.descriptionTooLong", {
      max: BOOKMARK_DESCRIPTION_MAX_LENGTH,
    });
  }
  return null;
}

/**
 * 标题留空就交给服务端用主机名兜底——这里发 `title: host` 而不是省略字段，
 * 是为了让编辑场景下「清空标题」也能回到主机名，而不是保留旧标题。
 */
export function buildBookmarkPayload(values: BookmarkFormValues): {
  url: string;
  title: string;
  description: string;
} {
  const url = normalizeBookmarkUrl(values.url) ?? values.url.trim();
  return {
    url,
    title: values.title.trim() || guessBookmarkHost(url),
    description: values.description.trim(),
  };
}
