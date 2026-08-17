/**
 * 从一篇 HTML 里抽出短摘录：og:description → twitter:description → meta description
 * → 第一段像样的 &lt;p&gt;。
 *
 * 这是「原文摘录」不是生成——分析器仍然只组织已经拿到的句子。
 */

import { stripHtml } from "./feed-parser.js";
import { fetchHtml } from "./http.js";

import type { RawSignal } from "./connector.js";

export const EXCERPT_MAX_LENGTH = 600;

/** 单篇超时。一轮里要补几十条，单篇不能拖到默认 15s。 */
const PAGE_EXCERPT_TIMEOUT_MS = 8_000;
const PAGE_EXCERPT_CONCURRENCY = 5;
/** 太短的 meta / 段落多半是导航或站点口号，不是事件说明。 */
const MIN_EXCERPT_LENGTH = 40;

const META_TAG_RE = /<meta\b[^>]*>/giu;
const PARAGRAPH_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/giu;
const ATTR_RE = /\b(property|name|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;

export function truncateExcerpt(value: string): string {
  const text = value.replace(/\s+/gu, " ").trim();
  if (text.length <= EXCERPT_MAX_LENGTH) {
    return text;
  }
  return `${text.slice(0, EXCERPT_MAX_LENGTH - 1).trimEnd()}…`;
}

export function isFetchableArticleUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "news.ycombinator.com" || host.endsWith(".ycombinator.com")) {
    return false;
  }
  if (/\.(pdf|zip|tar|gz|jpg|jpeg|png|gif|webp|mp4|mp3|svg|exe|dmg|iso|rss|json|css|js)$/iu.test(
    parsed.pathname,
  )) {
    return false;
  }
  return true;
}

export function excerptFromHtml(html: string): string {
  const head = html.slice(0, 80_000);
  const byKey = new Map<string, string>();
  for (const tag of head.match(META_TAG_RE) ?? []) {
    const attrs = readMetaAttrs(tag);
    const key = (attrs.property ?? attrs.name ?? "").trim().toLowerCase();
    const content = attrs.content?.trim() ?? "";
    if (key && content) {
      byKey.set(key, content);
    }
  }

  const fromMeta =
    byKey.get("og:description") ??
    byKey.get("twitter:description") ??
    byKey.get("description") ??
    "";
  const metaExcerpt = cleanExcerpt(fromMeta);
  if (metaExcerpt.length >= MIN_EXCERPT_LENGTH) {
    return metaExcerpt;
  }

  return firstParagraphExcerpt(html);
}

function firstParagraphExcerpt(html: string): string {
  for (const match of html.slice(0, 80_000).matchAll(PARAGRAPH_RE)) {
    const text = cleanExcerpt(match[1] ?? "");
    if (text.length >= MIN_EXCERPT_LENGTH) {
      return text;
    }
  }
  return "";
}

function cleanExcerpt(raw: string): string {
  return truncateExcerpt(stripHtml(raw));
}

function readMetaAttrs(tag: string): {
  property?: string;
  name?: string;
  content?: string;
} {
  const attrs: { property?: string; name?: string; content?: string } = {};
  ATTR_RE.lastIndex = 0;
  for (const match of tag.matchAll(ATTR_RE)) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (key === "property" || key === "name" || key === "content") {
      attrs[key] = value;
    }
  }
  return attrs;
}

export function looksLikeBotWall(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("just a moment") ||
    lower.includes("attention required") ||
    lower.includes("enable javascript") ||
    lower.includes("cloudflare")
  );
}

export function isUsableExcerpt(excerpt: string, title: string): boolean {
  const text = excerpt.trim();
  if (text.length === 0) {
    return false;
  }
  return normalizeComparable(text) !== normalizeComparable(title);
}

export function normalizeComparable(value: string): string {
  return value
    .trim()
    .replace(/[。！？.!?…]+$/u, "")
    .trim()
    .toLowerCase();
}

export async function fetchPageExcerpt(url: string): Promise<string> {
  if (!isFetchableArticleUrl(url)) {
    return "";
  }
  const html = await fetchHtml(url, { timeoutMs: PAGE_EXCERPT_TIMEOUT_MS });
  if (!html) {
    return "";
  }
  const excerpt = excerptFromHtml(html);
  return looksLikeBotWall(excerpt) ? "" : excerpt;
}

/**
 * 给还没有摘录的信号补上目标页的短描述。失败的条目保持原样，不抛。
 * 原地改 `excerpt`，调用方随后写入 DB。
 */
export async function fillEmptyExcerpts(
  signals: RawSignal[],
): Promise<number> {
  const targets = signals.filter(
    (signal) =>
      !isUsableExcerpt(signal.excerpt, signal.title) &&
      isFetchableArticleUrl(signal.url),
  );
  if (targets.length === 0) {
    return 0;
  }

  let filled = 0;
  await mapLimit(targets, PAGE_EXCERPT_CONCURRENCY, async (signal) => {
    try {
      const excerpt = await fetchPageExcerpt(signal.url);
      if (isUsableExcerpt(excerpt, signal.title)) {
        signal.excerpt = excerpt;
        filled += 1;
      }
    } catch {
      // 单篇失败不影响整轮；下一轮还会再试空摘录
    }
  });
  return filled;
}

async function mapLimit<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await fn(items[index]);
    }
  };
  const n = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
}
