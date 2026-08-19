/**
 * 从信号文本里抽实体——纯函数，不碰数据库。
 *
 * 与分析器同一条口径：**宁可少抽，不可抽错**。事件页上一个错的实体比没有实体更糟——
 * 它会把这个事件挂到一个不相干的聚合面上，而用户没有办法核对。
 *
 * 有 LLM key 时由分析器在**同一次调用**里产出更好的结果（见 llm-analyzer），
 * 这里是没有 key 时的兜底，也是 LLM 失败时的退路。
 */
import type { EventSourceKind } from "../../shared/index.js";

export const ENTITY_KINDS = ["company", "product", "person", "place", "org"] as const;
export type EntityKind = (typeof ENTITY_KINDS)[number];

export function isEntityKind(value: unknown): value is EntityKind {
  return (
    typeof value === "string" && (ENTITY_KINDS as readonly string[]).includes(value)
  );
}

export interface ExtractedEntity {
  name: string;
  kind: EntityKind;
  /** 在这一簇信号里被提到几次——排序权重，不是「重要性」的断言 */
  mention_count: number;
}

export interface ExtractableSignal {
  title: string;
  excerpt: string;
  source_kind: EventSourceKind;
}

/**
 * 句子起始位置的标记。英文标题的**句首单词恒大写**，单看一条标题分不出
 * `Stripe will acquire…`（真实体）和 `Models Are Getting Dumber`（普通名词）。
 *
 * 所以句首的**单个**大写词先扣住，只有当它在这一簇的别处以非句首身份出现过时
 * 才放行——这正是本产品的核心原则：跨来源印证。单信号事件因此会漏掉句首实体，
 * 那是刻意的保守，真正的 NER 由 LLM 路径承担。
 */
const SENTENCE_END = /[.:!?—–]$/u;

/**
 * Title Case 标题上，大写**不携带任何信息**——很多来源把每个实词都大写
 *（`Universal Health Coverage Could Save $1T and 114,000 Lives a Year`）。
 * 在这种标题上按大写抽实体会抽出「Buy Your Friends Batteries」
 * 「Won't Clear Up」这类整段短语。真实语料上量过：不加这道闸，假阳性约占一半。
 *
 * 所以先判版式：实词里大写占比超过阈值就认定是 Title Case，整条标题弃权。
 * 弃权是对的——「宁可少抽，不可抽错」：错的实体会把事件挂到不相干的聚合面上，
 * 而用户没有办法核对。
 */
const TITLE_CASE_RATIO = 0.6;
/**
 * 少于这么多实词就不判版式。
 *
 * 实测过 5：多抽到 5% 的标题，但把「Buy Your Friends Batteries」
 * 「A Decongestant Debate That」「Won't Clear Up」这类整段短语放了回来。
 * 精度换召回不划算——错的实体会把事件挂到不相干的聚合面上。
 */
const MIN_TITLE_CASE_WORDS = 4;
/** 判版式时忽略的虚词：Title Case 本来就不大写它们，算进去会拉低比例。 */
const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "for", "nor", "of", "on", "in", "at",
  "to", "from", "by", "with", "as", "is", "are", "was", "were", "be", "its",
  "it", "that", "this", "than", "then", "so", "if", "up", "out", "off", "over",
]);

/** 标题是不是 Title Case（大写不携带信息）。 */
export function isTitleCase(title: string): boolean {
  const content = title
    .split(/\s+/u)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(
      (word) =>
        word.length > 2 &&
        /\p{L}/u.test(word) &&
        !FUNCTION_WORDS.has(word.toLowerCase()),
    );
  // 词太少时比例没有意义：`Report from The New York Times` 的实词几乎全是专名，
  // 与 Title Case 在版式上无法区分。短标题交给后面的句首规则处理。
  if (content.length < MIN_TITLE_CASE_WORDS) {
    return false;
  }
  const capitalized = content.filter((word) => isCapitalized(word)).length;
  return capitalized / content.length >= TITLE_CASE_RATIO;
}

/** 全大写但明显不是实体的缩写与噪声。 */
const NOISE_TOKENS = new Set([
  "HN", "AI", "API", "CEO", "CTO", "US", "UK", "EU", "UN", "IT", "OK", "PDF",
  "HTML", "CSS", "JSON", "XML", "RSS", "URL", "HTTP", "HTTPS", "PR", "CI", "CD",
]);

/** 最多抽多少个——详情页展示得下，也避免一个长标题炸出十几个实体。 */
const MAX_ENTITIES = 12;
/** 实体名的长度边界。单字母不是实体；过长的多半是把半句话当成了名字。 */
const MIN_NAME_LENGTH = 2;
const MAX_NAME_WORDS = 4;

/**
 * 抽取。返回按提及次数降序的实体。
 *
 * 只看标题，不看摘录：摘录里大写词密度高得多（引语、机构全称、样板文字），
 * 假阳性远超收益。标题是被人精心压缩过的一句话，信噪比最高。
 */
export function extractEntities(
  signals: readonly ExtractableSignal[],
): ExtractedEntity[] {
  const counts = new Map<string, { name: string; count: number }>();
  const confident = new Set<string>();
  const provisional: { key: string; name: string }[] = [];

  const bump = (name: string) => {
    const key = normalizeEntityName(name);
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { name, count: 1 });
    }
    return key;
  };

  for (const signal of signals) {
    const { confident: sure, leadOnly } = capitalizedPhrases(signal.title);
    for (const phrase of sure) {
      confident.add(bump(phrase));
    }
    // 句首单词先记下来，等这一簇全部扫完再看有没有被印证
    for (const phrase of leadOnly) {
      provisional.push({ key: normalizeEntityName(phrase), name: phrase });
    }
  }

  for (const { key, name } of provisional) {
    if (confident.has(key)) {
      bump(name);
    }
  }

  return [...counts.values()]
    .filter((entry) => !isChangelogNoiseName(entry.name))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, MAX_ENTITIES)
    .map((entry) => ({
      name: entry.name,
      // 规则实现分不出公司 / 产品 / 人物——**不猜**。统一记 org，
      // 由 LLM 路径给出真正的类型；猜错的类型比没有类型更难纠正
      kind: "org" as EntityKind,
      mention_count: entry.count,
    }));
}

/**
 * 取标题里的大写词序列，分成两类：
 *
 * - `confident`：非句首出现的，直接算实体；
 * - `leadOnly`：只在句首以**单个词**出现的，要等印证（见 `extractEntities`）。
 *
 * 连续两个以上大写词即便在句首也算 confident——`Hacker News Users Ask…` 里的
 * `Hacker News` 不会是偶然。
 *
 * 只看标题，不看摘录：摘录里大写词密度高得多（引语、机构全称、样板文字），
 * 假阳性远超收益。标题是被人精心压缩过的一句话，信噪比最高。
 */
export function capitalizedPhrases(title: string): {
  confident: string[];
  leadOnly: string[];
} {
  if (isTitleCase(title)) {
    return { confident: [], leadOnly: [] };
  }

  const words = title.split(/\s+/u).filter((word) => word.length > 0);
  const confident: string[] = [];
  const leadOnly: string[] = [];
  let current: string[] = [];
  let atSentenceStart = false;

  const flush = () => {
    if (current.length > 0) {
      const name = current.join(" ");
      if (name.replace(/[^\p{L}\p{N}]/gu, "").length >= MIN_NAME_LENGTH) {
            (atSentenceStart && current.length === 1 ? leadOnly : confident).push(
          stripPossessive(name),
        );
      }
    }
    current = [];
    atSentenceStart = false;
  };

  words.forEach((raw, index) => {
    const word = raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}.+]+$/gu, "");
    if (!isCapitalized(word) || NOISE_TOKENS.has(word)) {
      flush();
      return;
    }
    if (current.length === 0) {
      atSentenceStart = index === 0 || SENTENCE_END.test(words[index - 1]);
    }
    current.push(word);
    if (current.length >= MAX_NAME_WORDS) {
      flush();
    }
  });
  flush();

  return {
    confident: [...new Set(confident)],
    leadOnly: [...new Set(leadOnly)].filter((name) => !confident.includes(name)),
  };
}

function isCapitalized(word: string): boolean {
  if (word.length === 0) {
    return false;
  }
  const first = word[0];
  // 纯数字、纯符号不是实体；`iPhone` 这类小写开头的品牌名由 LLM 路径接住
  return first === first.toUpperCase() && /\p{L}/u.test(first);
}

/**
 * 实体身份：大小写与空白归一 + 去掉所有格词尾。
 *
 * `Trump's` 与 `Trump` 是同一个实体，不去掉会在聚合面上分裂成两个。
 * **不做别名合并**——把 `Meta` 与 `Facebook` 合并需要外部知识，猜错更糟。
 */
export function normalizeEntityName(name: string): string {
  return stripPossessive(name).trim().replace(/\s+/gu, " ").toLowerCase();
}

/** `Trump's` → `Trump`；`Apple'` → `Apple`。 */
export function stripPossessive(name: string): string {
  return name.replace(/[''’]s\b/gu, "").replace(/[''’]$/u, "");
}

/**
 * changelog / git 元数据不是实体。
 *
 * Node.js 发版标题是 `2026-08-05, Version 26.7.0 (Current), @aduh95`——
 * `@aduh95` 是打 tag 的 steward，不是这件事在讲谁。旁边那些 `[58717685a1]`
 * 是 commit SHA。抽成「人物」会给每个 releaser 长出一张聚合页。
 *
 * 只认结构，不猜「这像不像用户名」：不带 `@` 的 `aduh95` 与 `gpt-4` 分不开。
 */
export function isChangelogNoiseName(name: string): boolean {
  const trimmed = stripWrappingPunctuation(name.trim());
  if (trimmed.length === 0 || trimmed === "@" || trimmed === "#") {
    return true;
  }
  if (trimmed.startsWith("@")) {
    return true;
  }
  if (/^#\d{1,7}$/u.test(trimmed)) {
    return true;
  }
  return /^[0-9a-f]{7,40}$/iu.test(trimmed);
}

/** `(@aduh95)` → `@aduh95`；`[58717685a1]` → `58717685a1`。保留开头的 `@` / `#`。 */
function stripWrappingPunctuation(name: string): string {
  return name.replace(/^[^\p{L}\p{N}@#]+|[^\p{L}\p{N}]+$/gu, "");
}
