/**
 * 事件主题的判定——纯函数，不碰数据库。
 *
 * 以前 `topic` 是**采集源的属性**：`RawSignal.topic = feed.topic`，一路原样写进事件。
 * 两个后果，第二个是结构性的：
 *
 *   1. 界面错标。HN 的默认 topic 是 tech，于是「投石机唯一已知死者」被标成「科技」
 *      （线上实测）。主题筛选条因此基本没有意义。
 *   2. 跨源合并被封死。聚类候选查询曾经带 `topic: signal.topic`，而目录里
 *      OpenAI/HF 是 ai、BBC 是 world、其余是 tech ——「OpenAI 发公告 +
 *      TechCrunch 报道 + HN 讨论」这个旗舰用例永远聚不到一起。
 *
 * 现在源上的 topic 降级成**提示**：它说明「这个源平时在报什么」，
 * 但一个事件是什么主题，由这一簇信号的文本说了算。
 *
 * 能力边界：`EVENT_TOPICS` 只有七格，语料里真实存在落不进任何一格的事件
 *（线上那条「中世纪投石机唯一已知死者」既不是 tech 也不是 world）。
 * 这种情况回落到源提示，而不是硬塞一个最像的——加主题枚举是产品决策，
 * 分类器不该替它做。
 */
import { EVENT_TOPICS, type EventSourceKind, type EventTopic } from "../../shared/index.js";

/** 源提示的权重：一手来源报什么就是什么，社区源什么都聊。 */
const SOURCE_HINT_WEIGHT: Record<EventSourceKind, number> = {
  official: 1.5,
  news: 0.8,
  community: 0.15,
};

/** 命中一个关键词记多少分。标题里的命中比摘录里的更有说服力。 */
const TITLE_HIT_WEIGHT = 2;
const EXCERPT_HIT_WEIGHT = 0.5;

/**
 * 主题关键词。刻意只收**高区分度**的词：
 * 「company」「market」这类哪个主题都出现的词一个都不要，它们只会把所有事件
 * 拉向同一个主题。宁可判不出来回落到源提示，也不要判错。
 */
const TOPIC_KEYWORDS: Record<EventTopic, readonly string[]> = {
  ai: [
    "ai", "llm", "gpt", "claude", "gemini", "openai", "anthropic", "deepmind",
    "huggingface", "transformer", "diffusion", "inference", "fine-tune",
    "finetune", "embedding", "rag", "agentic", "copilot", "chatbot",
    "machine learning", "neural", "model weights", "open-weight", "训练",
    "大模型", "人工智能", "推理",
  ],
  tech: [
    "api", "sdk", "kubernetes", "docker", "rust", "golang", "typescript",
    "javascript", "python", "linux", "postgres", "postgresql", "sqlite",
    "database", "compiler", "runtime", "framework", "github", "gitlab",
    "open source", "self-hosted", "cve", "vulnerability", "outage", "downtime",
    "latency", "browser", "chrome", "firefox", "webassembly", "开源", "漏洞",
  ],
  business: [
    "acquisition", "acquire", "acquires", "merger", "ipo", "funding",
    "series a", "series b", "series c", "valuation", "revenue", "earnings",
    "layoff", "layoffs", "bankruptcy", "antitrust", "lawsuit", "settlement",
    "shareholder", "billion deal", "stake", "收购", "融资", "裁员", "上市",
  ],
  world: [
    "election", "parliament", "sanctions", "treaty", "ceasefire", "refugee",
    "earthquake", "hurricane", "wildfire", "flood", "pandemic", "outbreak",
    "climate", "emissions", "united nations", "diplomat", "border", "protest",
    "選挙", "地震", "制裁", "难民", "气候",
  ],
  gaming: [
    "game", "gaming", "gameplay", "console", "playstation", "xbox", "nintendo",
    "steam", "esports", "speedrun", "roguelike", "mmo", "fps", "indie game",
    "游戏", "主机", "电竞",
  ],
  entertainment: [
    "movie", "film", "trailer", "box office", "netflix", "streaming series",
    "album", "tour dates", "grammy", "oscar", "celebrity", "showrunner",
    "电影", "专辑", "综艺",
  ],
  sports: [
    "match", "tournament", "championship", "playoff", "playoffs", "league",
    "olympics", "world cup", "transfer window", "striker", "quarterback",
    "赛季", "联赛", "夺冠",
  ],
};

export interface TopicClassifierSignal {
  title: string;
  excerpt: string;
  source_kind: EventSourceKind;
  /** 采集源上配的 topic —— 现在只是提示 */
  topic_hint: string;
}

/**
 * 给一簇信号定主题。
 *
 * 打分而不是「第一个命中的赢」：一条讲「OpenAI 收购某公司」的新闻同时命中
 * ai 与 business，该由哪边多、哪边出现在标题里决定，而不是由关键词表的书写顺序决定。
 *
 * 所有主题都是 0 分时回落到加权最高的源提示——那至少是「这个源平时在报什么」，
 * 比硬塞一个默认值诚实。
 */
export function classifyEventTopic(
  signals: readonly TopicClassifierSignal[],
): EventTopic {
  if (signals.length === 0) {
    return "tech";
  }

  const scores = new Map<EventTopic, number>(
    EVENT_TOPICS.map((topic) => [topic, 0]),
  );

  for (const signal of signals) {
    const title = signal.title.toLowerCase();
    const excerpt = signal.excerpt.toLowerCase();

    for (const topic of EVENT_TOPICS) {
      let hit = 0;
      for (const keyword of TOPIC_KEYWORDS[topic]) {
        if (containsKeyword(title, keyword)) {
          hit += TITLE_HIT_WEIGHT;
        } else if (containsKeyword(excerpt, keyword)) {
          hit += EXCERPT_HIT_WEIGHT;
        }
      }
      if (hit > 0) {
        scores.set(topic, (scores.get(topic) ?? 0) + hit);
      }
    }

    // 源提示始终参与，但权重远低于文本命中：它是先验，不是证据
    const hinted = normalizeTopic(signal.topic_hint);
    if (hinted) {
      scores.set(
        hinted,
        (scores.get(hinted) ?? 0) + SOURCE_HINT_WEIGHT[signal.source_kind],
      );
    }
  }

  let best: { topic: EventTopic; score: number } | null = null;
  for (const topic of EVENT_TOPICS) {
    const score = scores.get(topic) ?? 0;
    if (best === null || score > best.score) {
      best = { topic, score };
    }
  }

  return best && best.score > 0 ? best.topic : "tech";
}

/**
 * 词边界匹配。`ai` 不能命中 `said`、`rag` 不能命中 `fragment` —— 短词是这张表里
 * 区分度最高也最容易误伤的部分，子串匹配会让 ai 吃掉半个语料。
 *
 * 中文关键词没有词边界可言，直接子串匹配。
 */
function containsKeyword(haystack: string, keyword: string): boolean {
  if (!/[a-z0-9]/u.test(keyword)) {
    return haystack.includes(keyword);
  }
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(keyword, from);
    if (at < 0) {
      return false;
    }
    const before = at === 0 ? "" : haystack[at - 1];
    const after = haystack[at + keyword.length] ?? "";
    if (!isWordChar(before) && !isWordChar(after)) {
      return true;
    }
    from = at + 1;
  }
}

function isWordChar(char: string): boolean {
  return char.length > 0 && /[a-z0-9]/u.test(char);
}

function normalizeTopic(value: string): EventTopic | null {
  return (EVENT_TOPICS as readonly string[]).includes(value)
    ? (value as EventTopic)
    : null;
}
