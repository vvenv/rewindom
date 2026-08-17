import type {
  EventLocalizedMap,
  EventSourceKind,
  EventTopic,
} from "../../../shared/index.js";
import type { AppLocale } from "@rewindom/module-sdk";

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
  /** 信号原文的语种，决定翻译方向 */
  origin_locale: AppLocale;
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
  /**
   * 自由文案的语言表。规则实现走 `label_code`，不产出它；
   * LLM 实现在**同一次调用**里顺带给出各语言，不额外发请求。
   */
  label_text_i18n: EventLocalizedMap | null;
}

export interface AnalyzedEvent {
  /** 原文标题（聚类与 slug 都基于它，不会被译文覆盖） */
  title: string;
  /**
   * 「发生了什么」原文。规则实现下这里是**来源原文的摘录**而非生成文本——
   * 宁可少说，也不编造一句没有出处的话。
   */
  summary: string;
  /**
   * 标题/摘要的语言表，至少含 `origin_locale` 那一条。
   *
   * LLM 实现直接给全（翻译与摘要是同一次调用的产物，边际成本只是几百 token）；
   * 规则实现只给原文那条，缺的语言由 `translator/` 事后补。
   */
  title_i18n: EventLocalizedMap;
  summary_i18n: EventLocalizedMap;
  timeline: AnalyzedTimelineEntry[];
}

export interface EventAnalyzer {
  /** 落进 NewsEvent.analyzer，界面上要能看出这段摘要是谁写的 */
  id: "heuristic" | "llm";
  analyze: (input: AnalyzerInput) => Promise<AnalyzedEvent>;
}
