/**
 * 来源 favicon：同源代理。
 *
 * 访客打 `/events/icons/{host}`，服务端用采集那条 HTTP 出口去源站拉图。
 * 不经过 Google s2——那个地址不是全球可达。
 *
 * SSRF：只为**本站 EventFeed 推出来的 host** 出站。路径上的 host 已经过
 * `isIconHost`；这里再对一次源列表。未在列表里 → 404，一次 fetch 都不发。
 *
 * 不代理 SVG：字节从本站源发出，SVG 即代码。
 *
 * 空图不算取到：见 `icoDrawsNothing`。
 */

import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { sourceIconHost, isIconHost } from "../../shared/source-icon.js";
import { fetchHtml, userAgentForUrl } from "../ingest/http.js";

import type { SitePathResponse } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

const CACHE_CONTROL = "public, max-age=86400";
const CACHE_LIMIT = 256;
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 64 * 1024;
const ICO_DIR_OFFSET = 6;
const ICO_DIR_ENTRY_BYTES = 16;
const BMP_HEADER_BYTES = 40;
/** 只对调色板 BMP 判空；32bpp 的形状在 alpha 里，AND 掩码常年是全透明 */
const MAX_PALETTE_BIT_COUNT = 8;

const LINK_TAG_RE = /<link\b[^>]*>/giu;
const ATTR_RE = /\b(rel|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/giu;

type CacheEntry =
  | { kind: "hit"; body: Buffer; content_type: string; until: number }
  | { kind: "miss"; until: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<SitePathResponse | null>>();

export function iconHrefFromHtml(html: string, baseUrl: string): string | null {
  const head = html.slice(0, 80_000);
  let fallback: string | null = null;
  for (const tag of head.match(LINK_TAG_RE) ?? []) {
    const attrs = readLinkAttrs(tag);
    const rel = (attrs.rel ?? "").toLowerCase();
    const href = attrs.href?.trim() ?? "";
    if (!href || !/\bicon\b/u.test(rel)) {
      continue;
    }
    const absolute = resolveHref(baseUrl, href);
    if (!absolute) {
      continue;
    }
    if (
      /\bsvg\+xml\b/iu.test(attrs.type ?? "") ||
      /\.svg(?:[?#]|$)/iu.test(href)
    ) {
      continue;
    }
    if (/\bapple-touch-icon\b/u.test(rel)) {
      fallback ??= absolute;
      continue;
    }
    return absolute;
  }
  return fallback;
}

function readLinkAttrs(tag: string): {
  rel?: string;
  href?: string;
  type?: string;
} {
  const attrs: Record<string, string> = {};
  const typeRe = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu;
  const typeMatch = typeRe.exec(tag);
  if (typeMatch) {
    attrs.type = typeMatch[1] ?? typeMatch[2] ?? typeMatch[3] ?? "";
  }
  ATTR_RE.lastIndex = 0;
  let match = ATTR_RE.exec(tag);
  while (match) {
    const key = match[1]!.toLowerCase();
    attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
    match = ATTR_RE.exec(tag);
  }
  return attrs;
}

function resolveHref(baseUrl: string, href: string): string | null {
  try {
    const url = new URL(href, baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** 只认光栅图。SVG 从本站源发出等于在我们的源上跑来源的代码。 */
export function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) {
    return null;
  }
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  ) {
    return "image/x-icon";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * 这张 ICO 画不出任何形状吗？
 *
 * PMC 那六家（Variety / The Hollywood Reporter / Deadline / Rolling Stone /
 * Billboard / Consequence）的 `/favicon.ico` 是同一个 198 字节的桩：
 * 16×16、1bpp、XOR 位图整片同一个调色板索引、AND 掩码整片透明——屏幕上什么都没有。
 * 但它**是**一张合法的光栅图，`sniffImageType` 认，浏览器也「加载成功」，
 * 于是卡片上的首字母占位被盖住，读者看到的是一块空槽——比没有图标更像坏了。
 *
 * 更要紧的是它把真图挡住了：这几家的 HTML 里都挂着 `<link rel="icon">`
 * （variety 的 favicon.png、deadline 的 icon-32x32.png、consequence 的
 * favicon-32x32.png），只要 `/favicon.ico` 返回 200 就永远走不到那一步。
 * 判成「没取到」之后取图流程会自己接着往下走。
 *
 * 判据是结构性的，不认字节数：**每一格**都是调色板 BMP（色深 ≤ 8）且
 * XOR 与 AND 各自单一取值。逐行比、跳过 4 字节对齐的填充——16 宽的 1bpp
 * 每行只有 2 个字节有意义，后两个恒为 0，整段拉平比会永远判不出「单一取值」。
 *
 * 只判 ICO：PNG / WebP 的空图要解码才知道，成本不值当，而且没见过。
 * 色深 > 8 也不判：32bpp 的 ICO 常年把 AND 掩码写死成全透明，形状在 alpha 通道里。
 */
export function icoDrawsNothing(bytes: Uint8Array): boolean {
  if (bytes.length < ICO_DIR_OFFSET) {
    return false;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(0, true) !== 0 || view.getUint16(2, true) !== 1) {
    return false;
  }
  const count = view.getUint16(4, true);
  if (
    count === 0 ||
    ICO_DIR_OFFSET + count * ICO_DIR_ENTRY_BYTES > bytes.length
  ) {
    return false;
  }
  for (let index = 0; index < count; index += 1) {
    const dir = ICO_DIR_OFFSET + index * ICO_DIR_ENTRY_BYTES;
    const size = view.getUint32(dir + 8, true);
    const offset = view.getUint32(dir + 12, true);
    if (!icoEntryDrawsNothing(bytes, view, offset, size)) {
      return false;
    }
  }
  return true;
}

function icoEntryDrawsNothing(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  size: number,
): boolean {
  const end = offset + size;
  if (
    offset < ICO_DIR_OFFSET ||
    end > bytes.length ||
    size < BMP_HEADER_BYTES
  ) {
    return false;
  }
  // PNG-in-ICO 没有 BMP 头也没有 AND 掩码，走不了下面这套
  if (view.getUint32(offset, true) !== BMP_HEADER_BYTES) {
    return false;
  }
  const width = view.getInt32(offset + 4, true);
  // ICO 的 biHeight 是「图 + 掩码」，真高度是它的一半
  const height = Math.floor(view.getInt32(offset + 8, true) / 2);
  const bitCount = view.getUint16(offset + 14, true);
  const compression = view.getUint32(offset + 16, true);
  if (width <= 0 || height <= 0 || bitCount > MAX_PALETTE_BIT_COUNT) {
    return false;
  }
  if (compression !== 0) {
    return false;
  }
  const declaredColors = view.getUint32(offset + 32, true);
  const colors = declaredColors > 0 ? declaredColors : 2 ** bitCount;
  const xorOffset = offset + BMP_HEADER_BYTES + colors * 4;
  const xorRowBytes = Math.ceil((width * bitCount) / 8);
  const maskRowBytes = Math.ceil(width / 8);
  const maskOffset = xorOffset + stride(xorRowBytes) * height;
  if (maskOffset + stride(maskRowBytes) * height > end) {
    return false;
  }
  return (
    isUniformBitmap(bytes, xorOffset, xorRowBytes, height) &&
    isUniformBitmap(bytes, maskOffset, maskRowBytes, height)
  );
}

/** BMP 每行按 4 字节对齐，尾部填充不携带像素。 */
function stride(rowBytes: number): number {
  return Math.ceil(rowBytes / 4) * 4;
}

function isUniformBitmap(
  bytes: Uint8Array,
  offset: number,
  rowBytes: number,
  height: number,
): boolean {
  const first = bytes[offset];
  if (first === undefined) {
    return false;
  }
  const rowStride = stride(rowBytes);
  for (let row = 0; row < height; row += 1) {
    const start = offset + row * rowStride;
    for (let byte = 0; byte < rowBytes; byte += 1) {
      if (bytes[start + byte] !== first) {
        return false;
      }
    }
  }
  return true;
}

export async function renderSourceIcon(input: {
  tenantId: string;
  host: string;
}): Promise<SitePathResponse | null> {
  const host = input.host.toLowerCase();
  if (!isIconHost(host)) {
    return null;
  }

  const key = `${input.tenantId}:${host}`;
  const hit = readCache(key);
  if (hit?.kind === "miss") {
    return null;
  }
  if (hit?.kind === "hit") {
    return {
      body: hit.body,
      content_type: hit.content_type,
      cache_control: CACHE_CONTROL,
    };
  }

  const allowed = await isTenantIconHost(input.tenantId, host);
  if (!allowed) {
    return null;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }
  const task = loadAndCache(key, host);
  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

async function isTenantIconHost(
  tenantId: string,
  host: string,
): Promise<boolean> {
  const rows = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId),
    select: { name: true, url: true, connector: true },
  });
  return rows.some((row) => sourceIconHost(row) === host);
}

async function loadAndCache(
  key: string,
  host: string,
): Promise<SitePathResponse | null> {
  const fetched = await fetchPublisherIcon(host);
  if (!fetched) {
    remember(key, { kind: "miss", until: Date.now() + MISS_TTL_MS });
    return null;
  }
  remember(key, {
    kind: "hit",
    body: fetched.body,
    content_type: fetched.content_type,
    until: Date.now() + HIT_TTL_MS,
  });
  return {
    body: fetched.body,
    content_type: fetched.content_type,
    cache_control: CACHE_CONTROL,
  };
}

async function fetchPublisherIcon(
  host: string,
): Promise<{ body: Buffer; content_type: string } | null> {
  const origin = `https://${host}`;
  const fromIco = await tryImage(`${origin}/favicon.ico`);
  if (fromIco) {
    return fromIco;
  }
  let html: string | null = null;
  try {
    html = await fetchHtml(`${origin}/`, {
      timeoutMs: FETCH_TIMEOUT_MS,
      retries: 0,
    });
  } catch {
    html = null;
  }
  if (!html) {
    return null;
  }
  const href = iconHrefFromHtml(html, `${origin}/`);
  if (!href) {
    return null;
  }
  return tryImage(href);
}

async function tryImage(
  url: string,
): Promise<{ body: Buffer; content_type: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`timed out after ${FETCH_TIMEOUT_MS}ms`));
  }, FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": userAgentForUrl(url),
        accept: "image/*,*/*;q=0.1",
      },
    });
    if (!response.ok) {
      return null;
    }
    const raw = new Uint8Array(await response.arrayBuffer());
    if (raw.byteLength === 0 || raw.byteLength > MAX_BYTES) {
      return null;
    }
    const sniffed = sniffImageType(raw);
    if (!sniffed) {
      return null;
    }
    // 空桩当作没取到，让取图流程继续去读 HTML 里的 <link rel="icon">
    if (sniffed === "image/x-icon" && icoDrawsNothing(raw)) {
      return null;
    }
    return { body: Buffer.from(raw), content_type: sniffed };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function readCache(key: string): CacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) {
    return undefined;
  }
  if (entry.until <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry;
}

function remember(key: string, entry: CacheEntry): void {
  cache.set(key, entry);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
}

/** 测试用：清掉进程内缓存。 */
export function resetSourceIconCache(): void {
  cache.clear();
  inflight.clear();
}
