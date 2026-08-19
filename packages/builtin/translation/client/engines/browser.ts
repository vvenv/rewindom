/**
 * 浏览器内置翻译（Chrome 138+ 的 `Translator` / `LanguageDetector`）。
 *
 * **默认引擎**，也是这套方案敢重开翻译的底气：模型跑在本机，质量是 Google
 * NMT 那一档，不是 MyMemory 那一档；免费、无配额、无 key、离线可用，而且
 * 访客在读什么完全不出浏览器。
 *
 * 不支持的浏览器（Firefox / Safari / 移动端 Chrome）走 `available()` 返回
 * false，由上层降级——**不在这里偷偷 fallback 到联网引擎**，那等于把访客的
 * 阅读记录悄悄发出去。
 */

import { toBrowserCode } from "./locale-code.js";
import { TranslationUnavailableError, type TranslationEngineAdapter } from "./types.js";

interface BrowserTranslatorInstance {
  translate(text: string): Promise<string>;
  destroy?: () => void;
}

interface BrowserTranslatorApi {
  availability(input: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<"unavailable" | "downloadable" | "downloading" | "available">;
  create(input: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<BrowserTranslatorInstance>;
}

interface BrowserDetectorApi {
  availability(): Promise<string>;
  create(): Promise<{
    detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
  }>;
}

function translatorApi(): BrowserTranslatorApi | null {
  const api = (globalThis as { Translator?: BrowserTranslatorApi }).Translator;
  return api && typeof api.availability === "function" ? api : null;
}

function detectorApi(): BrowserDetectorApi | null {
  const api = (globalThis as { LanguageDetector?: BrowserDetectorApi })
    .LanguageDetector;
  return api && typeof api.create === "function" ? api : null;
}

export function isBrowserTranslationSupported(): boolean {
  return translatorApi() !== null;
}

/**
 * 猜源语言。判不出来就回 null，让上层跳过——**不默认 `en`**：把中文正文当英文
 * 送进去，引擎会输出一堆音译垃圾。
 */
async function detectSource(sample: string): Promise<string | null> {
  const api = detectorApi();
  if (!api) return null;
  try {
    const detector = await api.create();
    const results = await detector.detect(sample.slice(0, 400));
    const top = results[0];
    // 置信度低时不猜——宁可不翻
    return top && top.confidence >= 0.5 ? top.detectedLanguage : null;
  } catch {
    return null;
  }
}

export function createBrowserEngine(): TranslationEngineAdapter {
  /** 同一对语言复用一个 translator 实例：每次 create 都可能重新加载模型。 */
  const pool = new Map<string, Promise<BrowserTranslatorInstance>>();

  const instanceFor = (
    source: string,
    target: string,
  ): Promise<BrowserTranslatorInstance> => {
    const key = `${source}->${target}`;
    const existing = pool.get(key);
    if (existing) return existing;
    const api = translatorApi();
    if (!api) {
      return Promise.reject(
        new TranslationUnavailableError("browser translator unavailable"),
      );
    }
    const created = api.create({ sourceLanguage: source, targetLanguage: target });
    pool.set(key, created);
    return created;
  };

  return {
    id: "browser",
    async available({ target, source }) {
      const api = translatorApi();
      if (!api) return false;
      if (!source) return true; // 源语言留给 translate 时按正文探测
      try {
        const state = await api.availability({
          sourceLanguage: toBrowserCode(source),
          targetLanguage: toBrowserCode(target),
        });
        return state !== "unavailable";
      } catch {
        return false;
      }
    },
    async translate(texts, call) {
      if (texts.length === 0) return [];
      const source =
        call.source ?? (await detectSource(texts.join("\n").slice(0, 400)));
      if (!source) {
        throw new TranslationUnavailableError("source language undetected");
      }
      const sourceCode = toBrowserCode(source);
      const targetCode = toBrowserCode(call.target);
      // 同语言不译，直接回原文（探测到中文而目标也是中文时会走到这里）
      if (sourceCode === targetCode) return [...texts];

      const translator = await instanceFor(sourceCode, targetCode);
      const out: string[] = [];
      for (const text of texts) {
        if (call.signal?.aborted) break;
        try {
          out.push(await translator.translate(text));
        } catch {
          // 单段失败不连累整批——回原文，读者看到的是「这一句没译」而不是空白
          out.push(text);
        }
      }
      // 中断时把没轮到的补成原文，保证等长同序
      while (out.length < texts.length) out.push(texts[out.length] as string);
      return out;
    },
  };
}
