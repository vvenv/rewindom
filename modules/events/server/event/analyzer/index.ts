import { config, resolveLlmConfig } from "@rewindom/module-sdk/server";

import { heuristicAnalyzer } from "./heuristic-analyzer.js";
import { createLlmAnalyzer } from "./llm-analyzer.js";

import type {
  AnalyzedEvent,
  AnalyzerInput,
  EventAnalyzer,
  EventClassification,
} from "./analyzer.js";

export type {
  AnalyzedEntity,
  AnalyzedEvent,
  AnalyzedTimelineEntry,
  AnalyzerInput,
  AnalyzerSignal,
  AnalyzerUsage,
  EventAnalyzer,
  EventClassification,
} from "./analyzer.js";
export { heuristicAnalyzer } from "./heuristic-analyzer.js";
export { createLlmAnalyzer } from "./llm-analyzer.js";

/**
 * 选分析器。
 *
 * `auto`（默认）看这个站点有没有可用的 API Key（本站 BYOK 或平台 fallback）——
 * 本地开发与 CI 天然走规则实现，不会因为忘了配 key 就跑不起来，也不会因为
 * 跑了测试就产生模型账单。想在配了 key 的环境里强制走规则实现，设
 * `EVENTS_ANALYZER=heuristic`。
 */
export async function resolveEventAnalyzer(
  tenantId: string,
): Promise<EventAnalyzer> {
  const mode = config.events.analyzer;
  if (mode === "heuristic") {
    return heuristicAnalyzer;
  }
  const llm = await resolveLlmConfig(tenantId);
  if (mode === "llm") {
    return createLlmAnalyzer(llm);
  }
  return llm.apiKey.trim().length > 0
    ? createLlmAnalyzer(llm)
    : heuristicAnalyzer;
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
  analyzer: EventAnalyzer,
  onFallback?: (err: unknown) => void,
): Promise<AnalyzedEvent & { analyzer: EventAnalyzer["id"] }> {
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

/**
 * 跑一次窄分类。**失败返回 null，不兜底到规则实现。**
 *
 * 与 `analyzeEvent` 的兜底逻辑刻意不同：那里兜底是因为详情页不能开天窗，
 * 而这里没有天窗可开——`refreshEvent` 本来就在无条件跑 `classifyEventKind`
 * 与 `extractEntities`，分类只是想在它们之上再问一次模型。问不到就照旧。
 *
 * 返回 null 的语义是「这次没问成」，调用方**不该**写 `classified_at`：
 * 一次供应商抖动不该让这个事件终生没有类型。
 */
export async function classifyEvent(
  input: AnalyzerInput,
  analyzer: EventAnalyzer,
  onFailure?: (err: unknown) => void,
): Promise<EventClassification | null> {
  if (!analyzer.classify) {
    return null;
  }
  try {
    return await analyzer.classify(input);
  } catch (err) {
    onFailure?.(err);
    return null;
  }
}
