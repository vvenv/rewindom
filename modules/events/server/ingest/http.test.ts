import { afterEach, describe, expect, it, vi } from "vitest";

import {
  describeFetchError,
  fetchHtml,
  fetchText,
  INGEST_USER_AGENT,
  isTransientNetworkError,
} from "./http.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function jsonHeaders(type: string): Headers {
  return new Headers({ "content-type": type });
}

function okResponse(body: string, contentType = "application/xml"): Response {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: jsonHeaders(contentType),
    text: async () => body,
    json: async () => JSON.parse(body),
  } as Response;
}

function httpResponse(status: number, statusText: string): Response {
  return {
    ok: false,
    status,
    statusText,
    headers: jsonHeaders("text/plain"),
    text: async () => statusText,
  } as Response;
}

function fetchFailed(causeMessage: string): TypeError {
  const cause = new Error(causeMessage);
  (cause as Error & { code?: string }).code = "ECONNRESET";
  return Object.assign(new TypeError("fetch failed"), { cause });
}

describe("describeFetchError", () => {
  it("把 fetch failed 背后的 cause 拼进信息", () => {
    expect(describeFetchError(fetchFailed("read ECONNRESET"))).toBe(
      "fetch failed: read ECONNRESET",
    );
  });

  it("超时中止写成 timed out，而不是 This operation was aborted", () => {
    const err = new Error("This operation was aborted");
    err.name = "AbortError";
    err.cause = new Error("timed out after 20000ms");
    expect(describeFetchError(err)).toContain("timed out after 20000ms");
  });
});

describe("isTransientNetworkError", () => {
  it("认 fetch failed / abort / 超时", () => {
    expect(isTransientNetworkError(fetchFailed("ECONNRESET"))).toBe(true);
    const aborted = new Error("This operation was aborted");
    aborted.name = "AbortError";
    expect(isTransientNetworkError(aborted)).toBe(true);
    expect(isTransientNetworkError(new Error("HTTP 404 Not Found"))).toBe(false);
  });
});

describe("fetchText", () => {
  it("瞬时 fetch failed 后重试成功", async () => {
    const mock = vi
      .fn()
      .mockRejectedValueOnce(fetchFailed("read ECONNRESET"))
      .mockResolvedValueOnce(okResponse("<rss/>"));
    vi.stubGlobal("fetch", mock);

    await expect(fetchText("https://example.com/feed.xml")).resolves.toBe(
      "<rss/>",
    );
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock.mock.calls[0][1].headers["user-agent"]).toBe(INGEST_USER_AGENT);
  });

  it("404 不重试", async () => {
    const mock = vi.fn().mockResolvedValue(httpResponse(404, "Not Found"));
    vi.stubGlobal("fetch", mock);

    await expect(fetchText("https://example.com/missing.xml")).rejects.toThrow(
      /HTTP 404/,
    );
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it("502 会重试", async () => {
    const mock = vi
      .fn()
      .mockResolvedValueOnce(httpResponse(502, "Bad Gateway"))
      .mockResolvedValueOnce(okResponse("<rss/>"));
    vi.stubGlobal("fetch", mock);

    await expect(fetchText("https://example.com/feed.xml")).resolves.toBe(
      "<rss/>",
    );
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it("超时后带上 URL 抛出", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            return;
          }
          const onAbort = (): void => {
            reject(
              signal.reason instanceof Error
                ? signal.reason
                : Object.assign(
                    new DOMException("This operation was aborted", "AbortError"),
                    { name: "AbortError" },
                  ),
            );
          };
          if (signal.aborted) {
            onAbort();
            return;
          }
          signal.addEventListener("abort", onAbort);
        }),
    );

    await expect(
      fetchText("https://example.com/slow.xml", {
        timeoutMs: 20,
        retries: 0,
      }),
    ).rejects.toThrow(/timed out after 20ms — https:\/\/example.com\/slow.xml/);
  });
});

describe("fetchHtml", () => {
  it("默认不重试，避免一轮摘录把失败 URL 乘三", async () => {
    const mock = vi.fn().mockRejectedValue(fetchFailed("ECONNRESET"));
    vi.stubGlobal("fetch", mock);

    await expect(fetchHtml("https://example.com/post")).rejects.toThrow(
      /fetch failed/,
    );
    expect(mock).toHaveBeenCalledTimes(1);
  });
});
