import type { AppLocale } from "@rewindom/module-sdk";

/**
 * 事后翻译器——只在**规则分析器**这条路上用。
 *
 * LLM 分析器在写摘要的同一次调用里就把各语言给全了（见 llm-analyzer 的说明），
 * 那条路根本不会走到这里。这里存在的意义是：没有配 `OPENAI_API_KEY` 的部署
 * 也得有中文，而且不能因此要求用户去开任何账号。
 */
export interface EventTranslator {
  id: "mymemory" | "noop";
  /**
   * 按顺序翻译一批文本。**逐条可失败**——返回数组与入参等长，
   * 翻不动的那条给 `null`，调用方保留原文而不是落一个半吊子译文。
   */
  translate: (
    texts: readonly string[],
    from: AppLocale,
    to: AppLocale,
  ) => Promise<(string | null)[]>;
}

export const noopTranslator: EventTranslator = {
  id: "noop",
  translate: (texts) => Promise.resolve(texts.map(() => null)),
};
