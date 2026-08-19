import type {
  EventKind,
  EventSourceKind,
  EventTopic,
} from "../../../shared/index.js";

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
  /**
   * 这一格是哪条信号贡献的。**不可为空**：格子的身份就是信号，
   * 时间线靠 (event_id, signal_id) 做幂等 upsert，没有信号的格子既无法去重、
   * 也无法回答「这一格是新出现的吗」。两个分析器都必然带上它。
   */
  signal_id: string;
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
  /**
   * 事件主题。**可选**：规则实现不产出（由 `topic-classifier` 按关键词判定），
   * LLM 读得懂内容、给得出更准的答案时才填。
   * 落库前一律经 `isEventTopic` 校验——模型可能返回枚举外的字符串。
   */
  topic?: EventTopic;
  /**
   * 事件类型。**可选**，且与 topic 同构：规则实现不产出（由 `kind-classifier`
   * 按 source_kind 先验 + 关键词判定），LLM 读得懂内容时在**同一次调用**里
   * 顺带给出（不新增模型调用）。
   *
   * 落库前一律经 `isEventKind` 校验——模型会返回枚举外的字符串。
   * 注意它**压不过 source_kind 先验**：状态页的一条 incident 就是一次故障，
   * 模型看着一段「已恢复」的正文很可能判成别的。
   */
  kind?: EventKind;
  /**
   * 事件里的实体。**可选**：规则实现由 `entity-extractor` 保守抽取，
   * LLM 读得懂内容时在**同一次调用**里顺带产出（不新增模型调用）。
   * 落库前经 `isEntityKind` 校验——模型可能返回枚举外的类型。
   */
  entities?: AnalyzedEntity[];
  /**
   * 这次分析的模型用量。**可选**：规则实现不产出。
   *
   * 存在的理由只有一个——省钱的每一项都要能被度量。没有它，
   * 「加了闸门之后账单降了多少」「前缀缓存到底命中没有」都只能靠猜。
   */
  usage?: AnalyzerUsage;
}

/**
 * 一次模型调用的 token 用量。
 *
 * `cached_prompt_tokens` 是**前缀缓存命中**的部分：系统提示词与响应格式说明
 * 每次调用完全相同且排在最前面，供应商（deepseek / OpenAI）会自动命中，
 * 命中部分的单价通常是未命中的 1/10。供应商不报这个数时为 null。
 */
export interface AnalyzerUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cached_prompt_tokens: number | null;
}

export interface AnalyzedEntity {
  name: string;
  kind: string;
  mention_count?: number;
}

export interface EventAnalyzer {
  /** 落进 NewsEvent.analyzer，界面上要能看出这段摘要是谁写的 */
  id: "heuristic" | "llm";
  analyze: (input: AnalyzerInput) => Promise<AnalyzedEvent>;
}
