/**
 * 联网引擎：LibreTranslate / MyMemory 由浏览器直连，带 key 的引擎走服务端代理。
 *
 * **关于 `fetch`**：`coding-standards` 禁止在 React 组件与 Context 里直接
 * `fetch`，要走 client-kit 的 `api`。这里是例外且必须是例外——本文件同时被
 * 公开站的 enhance（无 React、无 client-kit，marketing 自己的 enhance 也是裸
 * `fetch`）复用，而第三方端点根本不该套我们的 api 基址与鉴权头。
 *
 * 直连第三方只允许**无 key** 的引擎：key 一旦进浏览器就等于公开。这条判据在
 * `shared/translation.ts` 的 `engineNeedsProxy` 里，不要在这里另立一套。
 */

import { toLibreCode, toMyMemoryCode } from "./locale-code.js";
import {
  TranslationUnavailableError,
  type TranslationEngineAdapter,
  type TranslateCall,
} from "./types.js";

import type { TranslateResponseBody } from "../../shared/translation.js";

/** 联网引擎的单次请求上限：超时就当不可用，不要卡住整页。 */
const REQUEST_TIMEOUT_MS = 15000;

function withTimeout(signal?: AbortSignal): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = (): void => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    },
  };
}

/**
 * LibreTranslate：一次收整批（`q` 收数组），自建实例免 key。
 * 端点由租户配置，公共实例限流很紧，生产建议自建。
 */
export function createLibreTranslateEngine(
  endpoint: string,
): TranslationEngineAdapter {
  const base = endpoint.replace(/\/+$/, "");
  return {
    id: "libretranslate",
    async available() {
      return base.length > 0;
    },
    async translate(texts, call) {
      if (texts.length === 0) return [];
      const { signal, done } = withTimeout(call.signal);
      try {
        const response = await fetch(`${base}/translate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            q: texts,
            source: call.source ? toLibreCode(call.source) : "auto",
            target: toLibreCode(call.target),
            format: "text",
          }),
          signal,
        });
        if (!response.ok) {
          throw new TranslationUnavailableError(
            `libretranslate ${response.status}`,
          );
        }
        const data = (await response.json()) as {
          translatedText?: string | string[];
        };
        const raw = data.translatedText;
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        // 端点返回条数对不上时整批回原文——错位的译文比不译更糟
        if (list.length !== texts.length) return [...texts];
        return list.map((item, index) => item || (texts[index] as string));
      } finally {
        done();
      }
    },
  };
}

/**
 * MyMemory：**一次只翻一段**，且按 IP 限配额。
 *
 * 纯客户端在这里反而占便宜——配额分摊到每个访客身上，不是整站共用一份。
 * 但它仍是**质量最差**的一档，只作为没有内置翻译时的兜底。
 */
export function createMyMemoryEngine(): TranslationEngineAdapter {
  const ENDPOINT = "https://api.mymemory.translated.net/get";
  /** 免费端点扛不住并发，超过这个数会开始回 429。 */
  const CONCURRENCY = 3;

  async function translateOne(
    text: string,
    call: TranslateCall,
  ): Promise<string> {
    const source = toMyMemoryCode(call.source ?? "en");
    const target = toMyMemoryCode(call.target);
    const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${source}|${target}`)}`;
    const { signal, done } = withTimeout(call.signal);
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return text;
      const data = (await response.json()) as {
        responseStatus?: number | string;
        responseData?: { translatedText?: string };
      };
      const status = Number(data.responseStatus);
      if (status !== 200) return text;
      return data.responseData?.translatedText?.trim() || text;
    } catch {
      return text;
    } finally {
      done();
    }
  }

  return {
    id: "mymemory",
    async available({ target, source }) {
      return Boolean(target) && source !== target;
    },
    async translate(texts, call) {
      const out = new Array<string>(texts.length);
      let cursor = 0;
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, texts.length) },
        async () => {
          while (cursor < texts.length) {
            const index = cursor++;
            if (call.signal?.aborted) {
              out[index] = texts[index] as string;
              continue;
            }
            out[index] = await translateOne(texts[index] as string, call);
          }
        },
      );
      await Promise.all(workers);
      return out;
    },
  };
}

/**
 * 服务端代理：DeepL / Google / LLM / 自定义端点走这条。
 *
 * key 留在 `TenantSetting` 的加密列里，代理**只转发不落库**——译文仍然只活在
 * 浏览器内存与 sessionStorage 里，「访客命中才译」的口径不因为经过服务端而变。
 */
export function createProxyEngine(): TranslationEngineAdapter {
  return {
    id: "custom",
    async available() {
      return true;
    },
    async translate(texts, call) {
      if (texts.length === 0) return [];
      const { signal, done } = withTimeout(call.signal);
      try {
        const response = await fetch("/api/public/translation/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            texts,
            target: call.target,
            source: call.source,
          }),
          signal,
        });
        if (!response.ok) {
          throw new TranslationUnavailableError(`proxy ${response.status}`);
        }
        const data = (await response.json()) as { data?: TranslateResponseBody };
        const list = data.data?.texts ?? [];
        if (list.length !== texts.length) return [...texts];
        return list.map((item, index) => item || (texts[index] as string));
      } finally {
        done();
      }
    },
  };
}
