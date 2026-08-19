/**
 * 翻译编排：缓存 → 术语遮罩 → 分批调引擎 → 还原 → 回写缓存。
 *
 * 引擎是哑的，所有共性逻辑收在这里一份。**失败一律回原文**，任何一步出岔子
 * 读者看到的都是准确的原文，而不是空白或半句——这是「译文只是查看辅助、原文
 * 才是真源」这条口径在代码里的落点。
 */



import {
  maskTerms,
  survivedMasking,
  unmaskTerms,
} from "../../shared/term-guard.js";
import {
  TRANSLATION_MAX_BATCH,
  TRANSLATION_MAX_CHARS, type PublicTranslationConfig 
} from "../../shared/translation.js";
import { createEngine, type TranslationEngineAdapter  } from "../engines/index.js";

import { readCached, writeCached } from "./cache.js";


export interface TranslatorOptions {
  config: PublicTranslationConfig;
  target: string;
  /** 页面语言；`null` 交给引擎自己探测。 */
  source: string | null;
  signal?: AbortSignal;
  /** 测试注入用；生产走 `createEngine`。 */
  engine?: TranslationEngineAdapter;
}

export interface Translator {
  readonly engineId: string;
  /** 与入参等长同序，翻不出的位置回原文。 */
  translate(texts: readonly string[]): Promise<string[]>;
  available(): Promise<boolean>;
}

/** 不值得送去翻译的段落：纯数字、纯符号、超长脏数据。 */
function isTranslatable(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > TRANSLATION_MAX_CHARS) return false;
  return /\p{L}/u.test(trimmed);
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function createTranslator(options: TranslatorOptions): Translator {
  const engine = options.engine ?? createEngine(options.config);
  const { target, source, config } = options;
  const keepTerms = config.keep_terms;

  return {
    engineId: engine.id,
    available: () => engine.available({ target, source }),
    async translate(texts) {
      const out = texts.map((text) => text);
      /** 真正要送出去的下标 —— 缓存命中与不可译的都不占名额。 */
      const pending: Array<{ index: number; masked: string; terms: string[] }> =
        [];

      texts.forEach((text, index) => {
        if (!isTranslatable(text)) return;
        const cached = readCached(engine.id, target, text);
        if (cached !== null) {
          out[index] = cached;
          return;
        }
        const { masked, terms } = maskTerms(text, keepTerms);
        pending.push({ index, masked, terms });
      });

      if (pending.length === 0) return out;

      for (const batch of chunk(pending, TRANSLATION_MAX_BATCH)) {
        if (options.signal?.aborted) break;
        let translated: string[];
        try {
          translated = await engine.translate(
            batch.map((item) => item.masked),
            { target, source, signal: options.signal },
          );
        } catch {
          // 整批失败：这一批保持原文，后面的批次照样试
          continue;
        }
        batch.forEach((item, position) => {
          const raw = translated[position];
          const original = texts[item.index] as string;
          if (!raw || raw === item.masked) return;
          /*
           * 占位符被引擎吃掉 = 术语已经被译坏，还原不回来。
           * 这时**保留原文**——一条把产品名译错的句子，读者是看不出来的。
           */
          if (!survivedMasking(raw, item.terms)) return;
          const restored = unmaskTerms(raw, item.terms).trim();
          if (!restored || restored === original) return;
          out[item.index] = restored;
          writeCached(engine.id, target, original, restored);
        });
      }

      return out;
    },
  };
}
