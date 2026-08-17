import type { EventSourceKind, EventTopic } from "../../../shared/index.js";

/**
 * 事件分析器契约。
 *
 * MVP §11 给 AI 划了很硬的边界：它负责聚类、摘要、时间线抽取，
 * **不负责**给建议、下判断、做预测、编造没有来源的事实。把这些职责收进一个
 * 接口，好处是「换成规则实现」与「换成 LLM 实现」对上层完全等价——
 * 没有 API key 的环境（本地开发、CI）跑的是同一条流水线，只是分析器不同。
 */

export interface AnalyzerSignal {
  signal_id: string;
  title: string;
  url: string;
  excerpt: string;
  source_name: string;
  source_kind: EventSourceKind;
  published_at: Date;
}

export interface AnalyzerInput {
  topic: EventTopic;
  /** 已按时间升序排好 */
  signals: AnalyzerSignal[];
}

export interface AnalyzedTimelineEntry {
  occurred_at: Date;
  /** 规则实现产出稳定 code（客户端按 events ns 翻译） */
  label_code: string | null;
  /** LLM 实现产出自由文案；与 label_code 二选一 */
  label_text: string | null;
  source_kind: EventSourceKind;
  source_name: string;
  signal_id: string | null;
  url: string | null;
}

export interface AnalyzedEvent {
  title: string;
  /**
   * 「发生了什么」。规则实现下这里是**来源原文的摘录**而非生成文本——
   * 宁可少说，也不编造一句没有出处的话。
   */
  summary: string;
  timeline: AnalyzedTimelineEntry[];
}

export interface EventAnalyzer {
  /** 落进 NewsEvent.analyzer，界面上要能看出这段摘要是谁写的 */
  id: "heuristic" | "llm";
  analyze: (input: AnalyzerInput) => Promise<AnalyzedEvent>;
}
