/**
 * 事件类型的判定——纯函数，不碰数据库。
 *
 * 存在的理由是**抽取的前提**：不知道这是哪一类，就不知道该抽什么字段。
 * 而抽取是那 97.8% 单信号事件唯一能加价值的地方——合并对它们根本不成立
 *（本地语料实测：833 个事件里 815 个终生只有一条信号，跨源的只有 12 个）。
 *
 * **必须在规则实现里成立。** 三道省钱闸门的第一道就是
 * `EVENTS_LLM_MIN_SIGNALS=2`，任何只在 LLM 路径上生效的判定，按设计永远
 * 碰不到那 97.8%。LLM 只能是「有 key 时更准」的增强，不能是前提。
 *
 * 能力边界与 topic 分类器完全同构：判不出来就返回 null，**不硬凑**。
 * 语料里绝大多数是普通报道，落不进任何一格；给它们硬塞一个最像的类型，
 * 会让整个类型筛选面失去意义。
 */
import {
  EVENT_KINDS,
  type EventKind,
  type EventSourceKind,
} from "../../shared/index.js";

export interface ClassifiableSignal {
  title: string;
  excerpt: string;
  source_kind: EventSourceKind;
}

/** 与 topic 分类器同一套权重：标题里的命中比摘录里的更有说服力。 */
const TITLE_HIT_WEIGHT = 2;
const EXCERPT_HIT_WEIGHT = 0.5;

/**
 * 判定的门槛。
 *
 * `MIN_SCORE = 2` 等于「至少一次标题命中」——只在摘录里蹭到一两个词不算数。
 * `MIN_MARGIN` 是与亚军的差距：一条既像收购又像法务的消息（收购案被反垄断
 * 起诉）**判不出来才是对的**，取高分那个只是把不确定性藏起来。
 */
const MIN_SCORE = 2;
const MIN_MARGIN = 2;

/**
 * 类型关键词。抄 `TOPIC_KEYWORDS` 的口径：只收**高区分度**的词。
 *
 * 刻意不收的例子：`announces`（每条公告都有）、`incident`（安全、法务、故障
 * 都在用）、`update`（无处不在）、`deal`（收购、合作、促销共用）。
 * 它们只会把所有事件拉向同一格——宁可判不出来。
 */
const KIND_KEYWORDS: Record<EventKind, readonly string[]> = {
  outage: [
    "outage", "downtime", "is down", "went down", "service disruption",
    "degraded performance", "elevated error", "elevated errors",
    "partial outage", "major outage", "service restored",
    "宕机", "故障", "服务中断",
  ],
  /*
   * **没有裸的 `launch` / `release` 系列词**，也是被真实语料打回来的。
   * 893 个事件跑下来，它们把这些全判成了发版：
   *   「Your guide to GitHub Universe 2026 is here: The schedule just launched!」
   *   「North Korea-Focused Film Fund Bearing North Launches With…」
   *   「Premier League build-up: More ref audio to be released this season」
   * 发版这一类主要靠 `release` 源的先验兜（`releases.atom` 的每一条就是一次发版），
   * 关键词只留歧义极小的短语。
   */
  release: [
    "now available", "general availability", "generally available",
    "rolls out", "rolling out", "changelog", "release notes", "new version",
    "发布版本",
  ],
  acquisition: [
    "acquire", "acquires", "acquired", "acquiring", "acquisition",
    "buys", "bought", "merger", "merges with", "takeover",
    "收购", "并购",
  ],
  /*
   * **没有裸的 `raises` / `raised`**，这是被真实语料打回来的：
   * 「UK video game industry charity football match raises over £63,000 for
   * physically disabled gamers」——裸 `raises` 把一场慈善赛判成了融资。
   * 让它成立需要判断主语是不是一家公司，关键词做不到。
   *
   * 代价是「Detroit startup Grounded raises $5M」这类真融资判不出来（留 null）。
   * 精度换召回是刻意的：错标会把事件挂到不相干的聚合面上，而读者没法核对。
   */
  funding: [
    "funding round", "seed round", "series a", "series b", "series c",
    "series d", "led the round", "venture round", "valuation",
    "raises seed", "raises series", "融资", "估值",
  ],
  legal: [
    "lawsuit", "lawsuits", "sues", "sued", "suing", "settlement", "settles",
    "antitrust", "court", "judge", "ruling", "injunction", "indictment",
    "subpoena", "alleges", "alleged", "allegations", "penalty", "fined",
    "fines", "class action", "fraud",
    "起诉", "诉讼", "罚款",
  ],
};

/*
 * 关键词按**词边界**匹配，不是子串包含。
 *
 * 子串匹配在真实语料上直接翻车（两条都是线上抓到的标题）：
 *   `Incident: Issues with App Mentions…`  →  `issues` 命中 `sues`  → 判成法务
 *   任何含 `defines` 的标题           →  命中 `fines`              → 判成法务
 * 短词是重灾区，而短词恰恰是这类判定最需要的。
 *
 * 中文词没有词边界可言（`\b` 在 CJK 之间不成立），所以含非 ASCII 的关键词
 * 退回子串包含——中文分词是另一个量级的问题，这里不碰。
 */
const KEYWORD_MATCHERS = new Map<string, RegExp | null>(
  Object.values(KIND_KEYWORDS)
    .flat()
    .map((word) => [
      word,
      /^[\x00-\x7F]+$/u.test(word)
        ? new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}\\b`, "u")
        : null,
    ]),
);

function hits(haystack: string, word: string): boolean {
  const matcher = KEYWORD_MATCHERS.get(word);
  return matcher ? matcher.test(haystack) : haystack.includes(word);
}

/**
 * 判定优先级，从硬到软。
 *
 * 1. `source_kind` 先验——Statuspage 的一条 incident **就是**一次故障，
 *    `releases.atom` 的一条 **就是**一次发版。没有解释空间，压过任何文本判定，
 *    也压过模型（模型看着一段「已恢复」的正文，很可能判成别的）。
 * 2. 关键词——零成本，覆盖那 97.8%，本期的主力。
 *
 * LLM 给的 kind 不在这里，在调用方：与 topic 同构，模型给了就优先于关键词，
 * 但仍**低于** source_kind 先验。
 *
 * `filing` **刻意不给先验**：SEC / FTC 既发处罚（legal）也发规则公告（不是），
 * 一刀切会把后者全标错。交给关键词判。
 */
export function classifyEventKind(
  signals: readonly ClassifiableSignal[],
): EventKind | null {
  if (signals.length === 0) {
    return null;
  }

  const prior = eventKindPrior(signals);
  if (prior) {
    return prior;
  }

  const scores = new Map<EventKind, number>();
  for (const signal of signals) {
    const title = signal.title.toLowerCase();
    const excerpt = signal.excerpt.toLowerCase();
    for (const kind of EVENT_KINDS) {
      let score = scores.get(kind) ?? 0;
      for (const word of KIND_KEYWORDS[kind]) {
        if (hits(title, word)) score += TITLE_HIT_WEIGHT;
        if (hits(excerpt, word)) score += EXCERPT_HIT_WEIGHT;
      }
      scores.set(kind, score);
    }
  }

  const ranked = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  const top = ranked[0];
  if (!top || top[1] < MIN_SCORE) {
    return null;
  }
  const runnerUp = ranked[1]?.[1] ?? 0;
  if (top[1] - runnerUp < MIN_MARGIN) {
    // 既像收购又像法务的消息判不出来才是对的——取高分只是把不确定性藏起来
    return null;
  }
  return top[0];
}

/**
 * `source_kind` 先验——判定链上最硬的一环，**压过模型**。
 *
 * 单独导出是给 `refreshEvent` 用的：那里要在「先验 → LLM → 关键词」三者之间
 * 排序，而模型只能排在先验之后。
 */
export function eventKindPrior(
  signals: readonly ClassifiableSignal[],
): EventKind | null {
  if (signals.some((s) => s.source_kind === "status")) {
    return "outage";
  }
  if (signals.some((s) => s.source_kind === "release")) {
    return "release";
  }
  return null;
}
