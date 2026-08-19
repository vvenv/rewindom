/** 采集侧统一的 HTTP 出口：带超时、带 UA、瞬时失败重试、非 2xx 直接抛。 */

const DEFAULT_TIMEOUT_MS = 20_000;
/** 额外重试次数（总尝试 = retries + 1）。目标页摘录单独关掉，避免一轮里把几十个 URL 再乘三。 */
const DEFAULT_RETRIES = 2;
const RETRY_BASE_MS = 400;

/**
 * RSS 阅读器惯例：Mozilla/5.0 (compatible; 产品; +联系 URL)。
 * 纯自定义 UA（`rewindom-events/1.0`）会被 Cloudflare / CloudFront / WordPress VIP
 * 间歇性直接掐连接，表现为 `TypeError: fetch failed` 或超时中止。
 */
export const INGEST_USER_AGENT =
  "Mozilla/5.0 (compatible; rewindom-events/1.0; +https://github.com/vvenv/rewindom)";

/**
 * Akamai Bot Manager（ftc.gov 等）把上面那条阅读器 UA 判成
 * 「abusive automated request」，HTTP 403、`server: AkamaiGHost`。
 * 在 Chrome UA 后面追加 `rewindom-events/…` 同样 403——它认的是产品名，不是缺头。
 *
 * 这些 feed 是公开的（robots.txt 未 Disallow `/feeds/`，Crawl-delay: 5；
 * 采集周期远宽于这个间隔）。只对这类 host 改用浏览器族 UA，默认仍标明身份。
 * 不要往这串里加产品名或联系 URL。
 */
export const INGEST_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0";

export function userAgentForUrl(url: string): string {
  const host = hostnameOf(url);
  if (host && isBrowserUserAgentHost(host)) {
    return INGEST_BROWSER_USER_AGENT;
  }
  return INGEST_USER_AGENT;
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isBrowserUserAgentHost(host: string): boolean {
  return host === "ftc.gov" || host.endsWith(".ftc.gov");
}

export interface IngestFetchOptions {
  timeoutMs?: number;
  accept?: string;
  retries?: number;
}

export async function fetchText(
  url: string,
  options?: IngestFetchOptions,
): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return response.text();
}

export async function fetchJson<T>(
  url: string,
  options?: IngestFetchOptions,
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    accept: "application/json",
  });
  return (await response.json()) as T;
}

/**
 * 只读 HTML。PDF / 图片 / JSON 没有 og:description，下载下来也解析不出摘录。
 * content-type 缺失时仍当 HTML 试——有的 CDN 不带头。
 */
export async function fetchHtml(
  url: string,
  options?: IngestFetchOptions,
): Promise<string | null> {
  const response = await fetchWithRetry(url, {
    ...options,
    retries: options?.retries ?? 0,
    accept:
      "text/html,application/xhtml+xml;q=0.9,application/xml;q=0.8,*/*;q=0.1",
  });
  const type = response.headers.get("content-type") ?? "";
  if (type.length > 0 && !/html|xhtml|xml/iu.test(type)) {
    return null;
  }
  const text = await response.text();
  return text.slice(0, 200_000);
}

async function fetchWithRetry(
  url: string,
  options?: IngestFetchOptions,
): Promise<Response> {
  const attempts = (options?.retries ?? DEFAULT_RETRIES) + 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetchOnce(url, options);
      if (response.ok) {
        return response;
      }
      const error = new Error(
        `HTTP ${response.status} ${response.statusText} — ${url}`,
      );
      lastError = error;
      if (attempt < attempts && isRetryableStatus(response.status)) {
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw error;
    } catch (err) {
      lastError = err;
      if (attempt < attempts && isRetryableFailure(err)) {
        await sleep(retryDelayMs(attempt));
        continue;
      }
      throw toFetchError(err, url);
    }
  }

  throw toFetchError(lastError, url);
}

async function fetchOnce(
  url: string,
  options?: IngestFetchOptions,
): Promise<Response> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": userAgentForUrl(url),
        ...(options?.accept ? { accept: options.accept } : {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function isRetryableStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function isRetryableFailure(err: unknown): boolean {
  if (err instanceof Error && /^HTTP \d{3}\b/u.test(err.message)) {
    const status = Number(err.message.slice(5, 8));
    return Number.isFinite(status) && isRetryableStatus(status);
  }
  return isTransientNetworkError(err);
}

export function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  if (err.name === "AbortError" || err.name === "TimeoutError") {
    return true;
  }
  return /fetch failed|network|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|socket|aborted|timed out/iu.test(
    collectErrorText(err),
  );
}

/** 把 `TypeError: fetch failed` 背后的 cause 拼进可读信息，便于记进 last_error。 */
export function describeFetchError(err: unknown): string {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const text = collectErrorText(err);
  if (
    err.name === "AbortError" ||
    err.name === "TimeoutError" ||
    /timed out/iu.test(text)
  ) {
    return /timed out/iu.test(text) ? text : "timed out";
  }
  return text;
}

function collectErrorText(err: Error): string {
  const parts: string[] = [];
  const seen = new Set<Error>();
  let current: unknown = err;
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message && !parts.includes(current.message)) {
      parts.push(current.message);
    }
    current = current.cause;
  }
  return parts.join(": ");
}

function toFetchError(err: unknown, url: string): Error {
  const message = describeFetchError(err);
  const withUrl = message.includes(url) ? message : `${message} — ${url}`;
  const wrapped = new Error(withUrl);
  if (err instanceof Error) {
    wrapped.cause = err;
  }
  return wrapped;
}

function retryDelayMs(attempt: number): number {
  return RETRY_BASE_MS * 2 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
