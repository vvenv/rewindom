import { getLlmClient, type ResolvedLlmConfig } from "@rewindom/module-sdk/server";

import {
  EVENT_KINDS,
  EVENT_TOPICS,
  isEventKind,
  isEventTopic,
  isFirstPartySource,
} from "../../../shared/index.js";

import { ENTITY_KINDS, isChangelogNoiseName, isEntityKind } from "../entity-extractor.js";

import { heuristicAnalyzer } from "./heuristic-analyzer.js";

import type {
  AnalyzedEntity,
  AnalyzedEvent,
  AnalyzerInput,
  AnalyzerSignal,
  AnalyzerUsage,
  EventAnalyzer,
} from "./analyzer.js";

/** 一次分析最多喂多少条信号——超过这个量，摘要质量的提升赶不上 token 成本。 */
const MAX_SIGNALS_PER_CALL = 20;
const MAX_EXCERPT_LENGTH = 500;
const MAX_LABEL_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 800;
const MAX_ENTITY_NAME_LENGTH = 80;
const MAX_ENTITIES_PER_EVENT = 10;

/**
 * 提示词把 MVP §11 的边界写死在系统消息里。
 *
 * 关键约束是最后两条：时间戳不由模型给（否则它会编造「11:08 开发者开始测试」这种
 * 看似合理、实则没有出处的格子），模型只负责给每条**已存在的**信号配一句标签。
 */
const SYSTEM_PROMPT = [
  "You organize signals collected from multiple platforms into ONE event.",
  "Rules you must not break:",
  "- Only state facts that appear in the provided sources. Never add outside knowledge.",
  "- Never give advice, recommendations, investment guidance, or predictions.",
  "- Never judge who is right. Attribute claims to the source that made them.",
  "- Mark unverified claims as discussion rather than fact.",
  "- Write in the dominant language of the source titles. Do not translate.",
  "- Keep product, company and person names in their original form.",
  "- Do not invent timestamps. You only label signals that were given to you.",
].join("\n");

const RESPONSE_SHAPE = [
  "Respond with JSON only:",
  '{"title": string, "summary": string, "topic": string, "kind": string | null, "timeline": [{"signal_index": number, "label": string}], "entities": [{"name": string, "kind": string}]}',
  "- title: one headline naming the event, max 120 characters.",
  "- summary: 3 to 5 sentences answering 'what happened', grounded in the sources.",
  `- topic: exactly one of ${EVENT_TOPICS.join(" | ")}. Judge it from what the event`,
  "  is about, not from which site reported it.",
  `- kind: one of ${EVENT_KINDS.join(" | ")}, or null. Use null unless the event`,
  "  clearly is one of them. A plain news report is null, not a guess.",
  "- timeline: one entry per meaningful signal, each label max 80 characters,",
  "  describing what that source did (announced / discussed / reported).",
  `- entities: the named companies, products, people, places or organisations`,
  `  this event is about. kind must be one of ${ENTITY_KINDS.join(" | ")}.`,
  "  Only include names that literally appear in the sources. Max 10.",
  "  Skip GitHub @handles, commit SHAs, PR numbers, and changelog bylines",
  "  (who tagged a release or authored a commit). Those are metadata,",
  "  not what the event is about.",
].join("\n");

/**
 * LLM 分析器。任何一步出问题（无 key、超时、返回不是 JSON、字段缺失）
 * 都退回规则分析器——事件页宁可平淡也不该开天窗。
 *
 * 密钥与模型按站点解析后再传进来，避免全实例共用一把平台 key。
 */
export function createLlmAnalyzer(llm: ResolvedLlmConfig): EventAnalyzer {
  return {
    id: "llm",
    analyze: async (input: AnalyzerInput): Promise<AnalyzedEvent> => {
      const signals = selectSignals(input.signals);
      if (signals.length === 0) {
        return heuristicAnalyzer.analyze(input);
      }

      const client = getLlmClient(llm, { maxRetries: 0 });
      const completion = await client.chat.completions.create({
        model: llm.model,
        temperature: llm.temperature,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              RESPONSE_SHAPE,
              "",
              `topic hint from the feeds (may be wrong): ${input.topic}`,
              "signals:",
              JSON.stringify(signals.map(toPromptSignal), null, 2),
            ].join("\n"),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      return {
        ...parseAnalyzerResponse(raw, signals),
        usage: parseUsage(completion.usage),
      };
    },
  };
}

/**
 * 读用量。
 *
 * 缓存命中数没有统一字段：OpenAI 报在 `prompt_tokens_details.cached_tokens`，
 * deepseek 报在 `prompt_cache_hit_tokens`。两个都试，都没有就承认不知道（null）——
 * 不要把「供应商没报」写成 0，那会让「缓存没生效」和「没数据」看起来一样。
 */
export function parseUsage(raw: unknown): AnalyzerUsage | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const usage = raw as {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    prompt_cache_hit_tokens?: unknown;
    prompt_tokens_details?: { cached_tokens?: unknown } | null;
  };
  const cached = [
    usage.prompt_tokens_details?.cached_tokens,
    usage.prompt_cache_hit_tokens,
  ].find((value) => typeof value === "number");

  return {
    prompt_tokens: toCount(usage.prompt_tokens),
    completion_tokens: toCount(usage.completion_tokens),
    cached_prompt_tokens: typeof cached === "number" ? cached : null,
  };
}

function toCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** 信号多时优先保留一手来源与最新进展，而不是简单截前 N 条。 */
function selectSignals(signals: readonly AnalyzerSignal[]): AnalyzerSignal[] {
  if (signals.length <= MAX_SIGNALS_PER_CALL) {
    return [...signals];
  }
  const official = signals.filter((s) => isFirstPartySource(s.source_kind));
  const rest = signals
    .filter((s) => !isFirstPartySource(s.source_kind))
    .sort((a, b) => b.published_at.getTime() - a.published_at.getTime())
    .slice(0, Math.max(0, MAX_SIGNALS_PER_CALL - official.length));
  return [...official, ...rest].sort(
    (a, b) => a.published_at.getTime() - b.published_at.getTime(),
  );
}

function toPromptSignal(signal: AnalyzerSignal, index: number) {
  return {
    signal_index: index,
    title: signal.title,
    source_name: signal.source_name,
    source_kind: signal.source_kind,
    published_at: signal.published_at.toISOString(),
    excerpt: signal.excerpt.slice(0, MAX_EXCERPT_LENGTH),
  };
}

interface RawTimelineEntry {
  signal_index?: unknown;
  label?: unknown;
}

/**
 * 解析模型返回。刻意宽进严出：模型多给的字段忽略，少给的字段回落到信号自身，
 * 但**时间戳只认信号里的**，模型给什么都不采信。
 */
export function parseAnalyzerResponse(
  raw: string,
  signals: readonly AnalyzerSignal[],
): AnalyzedEvent {
  const parsed = JSON.parse(raw) as {
    title?: unknown;
    summary?: unknown;
    topic?: unknown;
    kind?: unknown;
    timeline?: unknown;
    entities?: unknown;
  };

  const title =
    typeof parsed.title === "string" && parsed.title.trim().length > 0
      ? parsed.title.trim()
      : (signals[0]?.title ?? "");
  const summary =
    typeof parsed.summary === "string"
      ? parsed.summary.trim().slice(0, MAX_SUMMARY_LENGTH)
      : "";

  const rawEntries = Array.isArray(parsed.timeline)
    ? (parsed.timeline as RawTimelineEntry[])
    : [];

  const seen = new Set<number>();
  const timeline = rawEntries
    .map((entry) => {
      const index = Number(entry.signal_index);
      if (!Number.isInteger(index) || index < 0 || index >= signals.length) {
        return null;
      }
      if (seen.has(index)) {
        return null;
      }
      seen.add(index);

      const signal = signals[index];
      const label =
        typeof entry.label === "string" && entry.label.trim().length > 0
          ? entry.label.trim().slice(0, MAX_LABEL_LENGTH)
          : null;

      return {
        occurred_at: signal.published_at,
        // 模型没给标签就交回给客户端的 code 文案，不留空白格
        label_code: label === null ? `timeline.${signal.source_kind}` : null,
        label_text: label,
        source_kind: signal.source_kind,
        source_name: signal.source_name,
        signal_id: signal.signal_id,
        url: signal.url,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => a.occurred_at.getTime() - b.occurred_at.getTime());

  if (timeline.length === 0) {
    throw new Error("LLM 返回的 timeline 为空或全部指向不存在的信号");
  }

  // 模型给的主题只在落在枚举里时才采信；否则交回给规则分类器
  const topic = isEventTopic(parsed.topic) ? parsed.topic : undefined;
  // 类型同理。模型回 null / "none" / 枚举外的字符串都当没给，交回给规则分类器
  const kind = isEventKind(parsed.kind) ? parsed.kind : undefined;

  return {
    title,
    summary,
    timeline,
    topic,
    kind,
    entities: parseEntities(parsed.entities),
  };
}

/**
 * 解析实体。宽进严出：类型不在枚举里、名字为空、超出上限的一律丢掉。
 * 模型偶尔会返回 `"kind": "organization"` 这类近似值——不做映射猜测，直接丢。
 */
function parseEntities(value: unknown): AnalyzedEntity[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const out: AnalyzedEntity[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      continue;
    }
    const row = raw as { name?: unknown; kind?: unknown };
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (name.length === 0 || name.length > MAX_ENTITY_NAME_LENGTH) {
      continue;
    }
    if (!isEntityKind(row.kind)) {
      continue;
    }
    if (isChangelogNoiseName(name)) {
      continue;
    }
    out.push({ name, kind: row.kind });
    if (out.length >= MAX_ENTITIES_PER_EVENT) {
      break;
    }
  }
  return out;
}
