import { APP_LOCALES, config, getLlmClient } from "@rewindom/module-sdk/server";

import { heuristicAnalyzer } from "./heuristic-analyzer.js";

import { mergeLocalizedMaps } from "../../../shared/index.js";

import type {
  AnalyzedEvent,
  AnalyzerInput,
  AnalyzerSignal,
  EventAnalyzer,
} from "./analyzer.js";
import type { EventLocalizedMap } from "../../../shared/index.js";

/** 一次分析最多喂多少条信号——超过这个量，摘要质量的提升赶不上 token 成本。 */
const MAX_SIGNALS_PER_CALL = 20;
const MAX_EXCERPT_LENGTH = 500;
const MAX_LABEL_LENGTH = 80;
const MAX_SUMMARY_LENGTH = 800;

/** 要模型同时产出的语种。与 APP_LOCALES 同源，加语言时这里自动跟着变。 */
const TARGET_LOCALES = APP_LOCALES.map((locale) => locale.slug);

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
  "- Do not invent timestamps. You only label signals that were given to you.",
  "- Keep product, company and person names in their original form. Do not transliterate",
  "  or translate proper nouns such as OpenAI, GPT-6, Hacker News, OpenRouter.",
].join("\n");

/**
 * 输出既是分析结果也是译文。
 *
 * 分析本来就要读完全部来源，让同一次调用顺手给出各语言渲染，边际成本只是几百个
 * 输出 token——比事后再对标题单独发一轮机器翻译**更便宜也更准**：模型此刻手里
 * 有上下文，知道 "Stripe clinches deal" 里的 Stripe 是公司不是条纹。
 */
function buildResponseShape(): string {
  const localeList = TARGET_LOCALES.join(", ");
  return [
    "Respond with JSON only:",
    '{"title": {<locale>: string}, "summary": {<locale>: string},',
    ' "timeline": [{"signal_index": number, "label": {<locale>: string}}]}',
    `- Every text object MUST contain exactly these keys: ${localeList}.`,
    "- title: one headline naming the event, max 120 characters per language.",
    "- summary: 3 to 5 sentences answering 'what happened', grounded in the sources.",
    "- timeline: one entry per meaningful signal, each label max 80 characters,",
    "  describing what that source did (announced / discussed / reported).",
    "- The non-original languages are faithful translations, not new claims.",
  ].join("\n");
}

/**
 * LLM 分析器。任何一步出问题（无 key、超时、返回不是 JSON、字段缺失）
 * 都退回规则分析器——事件页宁可平淡也不该开天窗。
 */
export const llmAnalyzer: EventAnalyzer = {
  id: "llm",
  analyze: async (input: AnalyzerInput): Promise<AnalyzedEvent> => {
    const signals = selectSignals(input.signals);
    if (signals.length === 0) {
      return heuristicAnalyzer.analyze(input);
    }

    const client = getLlmClient({ maxRetries: 0 });
    const completion = await client.chat.completions.create({
      model: config.openai.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            buildResponseShape(),
            "",
            `topic: ${input.topic}`,
            `original language of the sources: ${input.origin_locale}`,
            "signals:",
            JSON.stringify(signals.map(toPromptSignal), null, 2),
          ].join("\n"),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    return parseAnalyzerResponse(raw, signals, input.origin_locale);
  },
};

/** 信号多时优先保留一手来源与最新进展，而不是简单截前 N 条。 */
function selectSignals(signals: readonly AnalyzerSignal[]): AnalyzerSignal[] {
  if (signals.length <= MAX_SIGNALS_PER_CALL) {
    return [...signals];
  }
  const official = signals.filter((s) => s.source_kind === "official");
  const rest = signals
    .filter((s) => s.source_kind !== "official")
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
 * 把模型给的 `{locale: text}` 收成语言表。
 *
 * 宽进：模型偶尔会退化成一个字符串（只给了一种语言），这时按原文语种收下，
 * 缺的语言留给 translator 补，而不是整条判失败。
 */
function readLocalizedMap(
  value: unknown,
  originLocale: string,
  maxLength: number,
): EventLocalizedMap {
  if (typeof value === "string") {
    return mergeLocalizedMaps({ [originLocale]: value.slice(0, maxLength) });
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const map: EventLocalizedMap = {};
  for (const [locale, text] of Object.entries(value as Record<string, unknown>)) {
    // 只收应用支持的语种，模型多给的（如 ja）直接丢掉，不让它进库
    if (typeof text === "string" && TARGET_LOCALES.includes(locale as never)) {
      map[locale] = text.slice(0, maxLength);
    }
  }
  return mergeLocalizedMaps(map);
}

/**
 * 解析模型返回。刻意宽进严出：模型多给的字段忽略，少给的字段回落到信号自身，
 * 但**时间戳只认信号里的**，模型给什么都不采信。
 */
export function parseAnalyzerResponse(
  raw: string,
  signals: readonly AnalyzerSignal[],
  originLocale: string,
): AnalyzedEvent {
  const parsed = JSON.parse(raw) as {
    title?: unknown;
    summary?: unknown;
    timeline?: unknown;
  };

  const titleMap = readLocalizedMap(parsed.title, originLocale, 240);
  const summaryMap = readLocalizedMap(
    parsed.summary,
    originLocale,
    MAX_SUMMARY_LENGTH,
  );

  // 原文标题是聚类与 slug 的依据，模型没给原文那条时回落到首条信号，绝不用译文顶替
  const title = titleMap[originLocale]?.trim() || (signals[0]?.title ?? "");
  const summary = summaryMap[originLocale]?.trim() ?? "";

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
      const labelMap = readLocalizedMap(
        entry.label,
        originLocale,
        MAX_LABEL_LENGTH,
      );
      const hasLabel = Object.keys(labelMap).length > 0;

      return {
        occurred_at: signal.published_at,
        // 模型没给标签就交回给客户端的 code 文案，不留空白格
        label_code: hasLabel ? null : `timeline.${signal.source_kind}`,
        label_text: hasLabel
          ? (labelMap[originLocale] ?? Object.values(labelMap)[0]!)
          : null,
        label_text_i18n: hasLabel ? labelMap : null,
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

  return {
    title,
    summary,
    title_i18n: mergeLocalizedMaps(titleMap, { [originLocale]: title }),
    summary_i18n: summary
      ? mergeLocalizedMaps(summaryMap, { [originLocale]: summary })
      : summaryMap,
    timeline,
  };
}
