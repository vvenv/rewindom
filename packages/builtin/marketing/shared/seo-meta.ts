/**
 * 公开页 `<title>` / meta description 的拼法。
 *
 * 单独抽出来是因为 SSR 渲染器和测试都要用同一条上限：搜索结果里 title 大约 60 字，
 * 再长会被截断成「……」；description 缺省时不能所有页都回落同一句 tagline。
 */

export const DOCUMENT_TITLE_MAX = 60;

export function truncateDocumentTitle(
  text: string,
  max = DOCUMENT_TITLE_MAX,
): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export function formatDocumentTitle(input: {
  pageTitle: string;
  siteName: string;
  isHome: boolean;
}): string {
  const siteName = input.siteName.trim();
  if (input.isHome) return truncateDocumentTitle(siteName);
  const pageTitle = input.pageTitle.trim() || siteName;
  const suffix = siteName ? ` · ${siteName}` : "";
  if (suffix && pageTitle.length + suffix.length <= DOCUMENT_TITLE_MAX) {
    return `${pageTitle}${suffix}`;
  }
  return truncateDocumentTitle(pageTitle);
}

/**
 * 页自己写了 description 就用它。首页可以回落标语；其它页若也回落标语，
 * 主题列表、无摘要的详情会变成同一句——爬虫记 Duplicate meta descriptions。
 */
export function formatDocumentDescription(input: {
  pageDescription: string;
  pageTitle: string;
  tagline: string;
  isHome: boolean;
}): string {
  const description = input.pageDescription.trim();
  if (description) return description;
  const tagline = input.tagline.trim();
  if (input.isHome) return tagline;
  const pageTitle = input.pageTitle.trim();
  if (pageTitle && tagline) return `${pageTitle} — ${tagline}`;
  return pageTitle || tagline;
}
