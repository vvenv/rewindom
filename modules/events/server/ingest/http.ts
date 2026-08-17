/** 采集侧统一的 HTTP 出口：带超时、带 UA、非 2xx 直接抛。 */

const DEFAULT_TIMEOUT_MS = 15_000;

/** 有些站点对空 UA 直接 403，给一个能被识别、能被封的固定标识比匿名更负责任。 */
const USER_AGENT = "rewindom-events/1.0 (+https://github.com/vvenv/rewindom)";

export async function fetchText(
  url: string,
  options?: { timeoutMs?: number; accept?: string },
): Promise<string> {
  const response = await fetchWithTimeout(url, options);
  return response.text();
}

export async function fetchJson<T>(
  url: string,
  options?: { timeoutMs?: number },
): Promise<T> {
  const response = await fetchWithTimeout(url, {
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
  options?: { timeoutMs?: number },
): Promise<string | null> {
  const response = await fetchWithTimeout(url, {
    ...options,
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

async function fetchWithTimeout(
  url: string,
  options?: { timeoutMs?: number; accept?: string },
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        ...(options?.accept ? { accept: options.accept } : {}),
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}`);
    }
    return response;
  } finally {
    clearTimeout(timer);
  }
}
