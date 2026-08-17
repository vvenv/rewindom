import { config } from "@rewindom/module-sdk/server";

import { heuristicAnalyzer } from "./heuristic-analyzer.js";
import { llmAnalyzer } from "./llm-analyzer.js";

import type { AnalyzedEvent, AnalyzerInput, EventAnalyzer } from "./analyzer.js";

export type {
  AnalyzedEvent,
  AnalyzedTimelineEntry,
  AnalyzerInput,
  AnalyzerSignal,
  EventAnalyzer,
} from "./analyzer.js";
export { heuristicAnalyzer } from "./heuristic-analyzer.js";
export { llmAnalyzer } from "./llm-analyzer.js";

/**
 * 选分析器。
 *
 * `auto`（默认）看有没有配 OPENAI_API_KEY——本地开发与 CI 天然走规则实现，
 * 不会因为忘了配 key 就跑不起来，也不会因为跑了测试就产生模型账单。
 * 想在配了 key 的环境里强制走规则实现，设 `EVENTS_ANALYZER=heuristic`。
 */
export function resolveEventAnalyzer(): EventAnalyzer {
  const mode = config.events.analyzer;
  if (mode === "heuristic") {
    return heuristicAnalyzer;
  }
  if (mode === "llm") {
    return llmAnalyzer;
  }
  return config.openai.apiKey.trim().length > 0 ? llmAnalyzer : heuristicAnalyzer;
}

/**
 * 跑分析并在失败时兜底。
 *
 * LLM 会超时、会限流、会返回一段前言加一个 JSON。这些都不该让事件页开天窗，
 * 所以任何异常都退回规则实现，并把实际用的实现 id 一并返回——
 * 详情页要如实告诉用户这段摘要是谁写的。
 */
export async function analyzeEvent(
  input: AnalyzerInput,
  onFallback?: (err: unknown) => void,
): Promise<AnalyzedEvent & { analyzer: EventAnalyzer["id"] }> {
  const analyzer = resolveEventAnalyzer();
  try {
    const result = await analyzer.analyze(input);
    return { ...result, analyzer: analyzer.id };
  } catch (err) {
    if (analyzer.id === "heuristic") {
      throw err;
    }
    onFallback?.(err);
    const fallback = await heuristicAnalyzer.analyze(input);
    return { ...fallback, analyzer: heuristicAnalyzer.id };
  }
}
