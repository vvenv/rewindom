/**
 * 从一篇 HTML 里抽出短摘录：og:description → twitter:description → meta description
 * → 第一段像样的 &lt;p&gt;。顺带取 `og:image`——同一次抓取、同一次遍历 meta，
 * 不为图另开一轮网络请求。
 *
 * 这是「原文摘录」不是生成——分析器仍然只组织已经拿到的句子。
 */

import { stripHtml } from "./feed-parser.js";
import { fetchHtml } from "./http.js";

import {
  absoluteImageUrl,
  isUsableImageUrl,
} from "../../shared/article-image.js";

import type { RawSignal } from "./connector.js";

export const EXCERPT_MAX_LENGTH = 600;

/** 单篇超时。一轮里要补几十条，单篇不能拖到默认 15s。 */
const PAGE_EXCERPT_TIMEOUT_MS = 8_000;
const PAGE_EXCERPT_CONCURRENCY = 5;
/** 太短的 meta / 段落多半是导航或站点口号，不是事件说明。 */
const MIN_EXCERPT_LENGTH = 40;

const META_TAG_RE = /<meta\b[^>]*>/giu;
const PARAGRAPH_RE = /<p\b[^>]*>([\s\S]*?)<\/p>/giu;
const ATTR_RE =
  /\b(property|name|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;

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
  if (
    /\.(pdf|zip|tar|gz|jpg|jpeg|png|gif|webp|mp4|mp3|svg|exe|dmg|iso|rss|json|css|js)$/iu.test(
      parsed.pathname,
    )
  ) {
    return false;
  }
  return true;
}

function metaMap(html: string): Map<string, string> {
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
  return byKey;
}

/**
 * 目标页的配图。
 *
 * `og:image` 优先——那是发布方专门标出来给人做链接预览的那一张。
 * `twitter:image` 是同一件事的另一种写法，少数站只写它。
 * 相对地址按页面地址补绝对，补不出来就丢（半个地址就是一张裂图）。
 */
export function imageFromHtml(html: string, pageUrl: string): string | null {
  const byKey = metaMap(html);
  const raw =
    byKey.get("og:image") ??
    byKey.get("og:image:url") ??
    byKey.get("twitter:image") ??
    byKey.get("twitter:image:src") ??
    null;
  return absoluteImageUrl(raw, pageUrl);
}

export function excerptFromHtml(html: string): string {
  const byKey = metaMap(html);

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

/**
 * 摘录与配图**同一次抓取**产出。分成两个函数会把同一个页面下载两遍——
 * 一轮补几十条，那是白白翻倍的出站流量。
 */
export interface PageExtract {
  excerpt: string;
  image_url: string | null;
}

export const EMPTY_PAGE_EXTRACT: PageExtract = { excerpt: "", image_url: null };

export async function fetchPageExcerpt(url: string): Promise<PageExtract> {
  if (!isFetchableArticleUrl(url)) {
    return EMPTY_PAGE_EXTRACT;
  }
  const html = await fetchHtml(url, { timeoutMs: PAGE_EXCERPT_TIMEOUT_MS });
  if (!html) {
    return EMPTY_PAGE_EXTRACT;
  }
  const excerpt = excerptFromHtml(html);
  /*
   * 机器人墙的页面**图也不要**：那张多半是墙自己的插画或站点品牌图，
   * 与这篇文章无关。摘录判出墙就整页作废，不要只丢文字留下图。
   */
  if (looksLikeBotWall(excerpt)) {
    return EMPTY_PAGE_EXTRACT;
  }
  return { excerpt, image_url: imageFromHtml(html, url) };
}

/**
 * 给还没有摘录**或**还没有配图的信号抓一次目标页。失败的条目保持原样，不抛。
 * 原地改 `excerpt` / `image_url`，调用方随后写入 DB。
 *
 * 判「要不要抓」把图也算进去，但 feed 里已经给了图的（`media:content` /
 * `enclosure`）就只按摘录判——那种源不该因为图已经有了而少补一次摘录，
 * 也不该因为摘录已经有了而多抓一次页面。
 */
export async function fillEmptyExcerpts(signals: RawSignal[]): Promise<number> {
  const targets = signals.filter(
    (signal) =>
      (!isUsableExcerpt(signal.excerpt, signal.title) ||
        !isUsableImageUrl(signal.image_url)) &&
      isFetchableArticleUrl(signal.url),
  );
  if (targets.length === 0) {
    return 0;
  }

  let filled = 0;
  await mapLimit(targets, PAGE_EXCERPT_CONCURRENCY, async (signal) => {
    try {
      const extract = await fetchPageExcerpt(signal.url);
      if (isUsableExcerpt(extract.excerpt, signal.title)) {
        signal.excerpt = extract.excerpt;
        filled += 1;
      }
      // feed 自己给的图优先：它跟条目绑定，比页面级的 og:image 更贴这一篇
      if (!isUsableImageUrl(signal.image_url) && extract.image_url) {
        signal.image_url = extract.image_url;
      }
    } catch {
      // 单篇失败不影响整轮；下一轮还会再试
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
