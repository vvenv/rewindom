/**
 * 翻译引擎适配器契约。
 *
 * 引擎是**哑的**：只管把一批纯文本换成另一种语言。术语保护、缓存、批次切分、
 * 失败回退都在上层 `translator.ts` 里做一次，不要在每个引擎里重复——上一次
 * 翻译的质量问题就是散在各处修补、谁也说不清哪条生效导致的。
 */

import type { TranslationEngine } from "../../shared/translation.js";

export interface TranslateCall {
  target: string;
  /** null = 让引擎自己判断源语言。 */
  source: string | null;
  signal?: AbortSignal;
}

export interface TranslationEngineAdapter {
  readonly id: TranslationEngine;
  /**
   * 这台浏览器 / 这个端点当前能不能翻这一对语言。
   * 浏览器内置引擎要据此下载模型，可能耗时数秒，所以是异步的。
   */
  available(call: Pick<TranslateCall, "target" | "source">): Promise<boolean>;
  /** 返回值与入参**等长同序**；单段翻不出时回原文。 */
  translate(texts: string[], call: TranslateCall): Promise<string[]>;
}

/** 引擎不可用（没配置、浏览器不支持、端点挂了）。调用方据此显示「不可用」而不是「失败」。 */
export class TranslationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationUnavailableError";
  }
}
