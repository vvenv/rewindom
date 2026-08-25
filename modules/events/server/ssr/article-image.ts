/**
 * 文章插图的同源代理 —— **只在热链裂图时兜底**。
 *
 * 详情页的 `<img src>` 默认指向出版方自己的地址（文件由他们托管分发，换掉或删掉
 * 就等于撤回，这是最贴近「链接预览」的形态）。有些站防盗链，读者那边会裂图，
 * 这时前端把 src 换成 `/events/images/{token}`，由服务端去拉。
 *
 * SSRF 闸门**不是 host 白名单，是「这个 URL 我们真的采到过」**：
 * token 解出地址后先查本站 `EventSignal.image_url` 有没有这一条，没有直接 404。
 * 比维护 host 名单严格得多（攻击者没法凭空构造一个内网地址），也不会漏掉新源。
 *
 * 不代理 SVG：字节从本站源发出，SVG 即代码。与来源 favicon 同一条。
 */

import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import { decodeImageToken } from "../../shared/article-image.js";
import { userAgentForUrl } from "../ingest/http.js";

import { sniffImageType } from "./source-icon.js";

import type { SitePathResponse } from "@rewindom/builtin/marketing/shared/site-path-handlers.js";

const CACHE_CONTROL = "public, max-age=86400";
const CACHE_LIMIT = 128;
const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const MISS_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8_000;
/**
 * 文章插图比 favicon 大得多，但也不该无上限——代理是兜底不是图床。
 * 超过这个尺寸的宁可裂图：读者少看一张图，好过服务端替谁扛流量。
 */
const MAX_BYTES = 3 * 1024 * 1024;

type CacheEntry =
  | { kind: "hit"; body: Buffer; content_type: string; until: number }
  | { kind: "miss"; until: number };

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<SitePathResponse | null>>();

export async function renderArticleImage(input: {
  tenantId: string;
  token: string;
}): Promise<SitePathResponse | null> {
  const url = decodeImageToken(input.token);
  if (!url) {
    return null;
  }

  const key = `${input.tenantId}:${url}`;
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

  // 闸门：本站采到过这个地址才出站。一次 fetch 都不发给别的。
  const known = await prisma.eventSignal.findFirst({
    where: withTenantScope(input.tenantId, { image_url: url }),
    select: { id: true },
  });
  if (!known) {
    return null;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }
  const task = loadAndCache(key, url);
  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

async function loadAndCache(
  key: string,
  url: string,
): Promise<SitePathResponse | null> {
  const fetched = await fetchImage(url);
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

async function fetchImage(
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
    // 魔数认不出来就不发——声明的 content-type 不可信，SVG 也在这一步被挡掉
    const sniffed = sniffImageType(raw);
    if (!sniffed) {
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
  return entry;
}

function remember(key: string, entry: CacheEntry): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(key, entry);
}
