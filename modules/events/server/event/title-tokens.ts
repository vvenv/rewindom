/**
 * 标题分词与相似度——启发式聚类的判据。
 *
 * 「这些内容是不是同一件事」在 MVP §11 里是 AI 的第一职责，但把它做成
 * 纯函数有两个好处：没有 API key 时产品照样能跑；有 key 时 LLM 只需要
 * 在这一层给出的候选集上做裁决，而不是对全库两两比对。
 */

/**
 * 停用词 = 英文虚词 + 新闻标题里几乎每条都有、因此毫无区分度的词。
 * 「announces」这类词留着会让所有发布类新闻互相靠拢。
 */
const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "at", "by", "for", "with",
  "about", "into", "to", "from", "in", "on", "off", "over", "after", "before",
  "is", "are", "was", "were", "be", "been", "being", "as", "it", "its", "this",
  "that", "these", "those", "you", "your", "we", "our", "they", "their", "he",
  "she", "his", "her", "will", "would", "can", "could", "should", "may",
  "new", "now", "how", "why", "what", "when", "who", "which", "more", "most",
  "just", "than", "then", "up", "down", "out", "all", "no", "not", "via",
  "says", "said", "say", "announces", "announced", "announcement", "launches",
  "launched", "launch", "introduces", "introducing", "releases", "released",
  "release", "update", "updates", "report", "reports", "show", "hn", "ask",
]);

/** 指纹里保留多少个词——太少会把不同事件撞在一起，太多则几乎不可能重合。 */
const FINGERPRINT_TOKEN_LIMIT = 8;

export function tokenizeTitle(title: string): string[] {
  const lowered = title.toLowerCase();

  const latin = (lowered.match(/[a-z0-9][a-z0-9'’+.\-]*/gu) ?? [])
    .map((token) => token.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gu, ""))
    .map(stripHostSuffix)
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));

  // 中文没有空格，退化成二元切分——够用来判断两条中文标题是否在说同一件事
  const cjk: string[] = [];
  for (const run of lowered.match(/[一-鿿]{2,}/gu) ?? []) {
    for (let i = 0; i + 2 <= run.length; i += 1) {
      cjk.push(run.slice(i, i + 2));
    }
  }

  return [...new Set([...latin, ...cjk])];
}

/**
 * 域名形态的 token 归一到主体名：`github.com` → `github`。
 *
 * 线上真实漏合并：同一次 GitHub 故障里，「Incident with Github.com」的 token 是
 * `github.com`，「GitHub down again? no PR access」的是 `github`——两者**共享 0 个词**，
 * 连相似度那一步都走不到（`MIN_SHARED_TOKENS` 卡在前面）。
 *
 * 只剥常见 TLD，不做通用域名解析：`node.js`、`vue.js` 这类不能被剥成 `node`/`vue`
 * 之外的东西，而 `example.co.uk` 这种多级后缀在标题里几乎不出现，多剥一层的
 * 收益远小于误伤风险。
 */
const HOST_SUFFIXES = [
  ".com", ".org", ".net", ".io", ".dev", ".ai", ".co", ".gov", ".edu",
];

function stripHostSuffix(token: string): string {
  for (const suffix of HOST_SUFFIXES) {
    if (token.length > suffix.length && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

/**
 * 事件指纹：取区分度最高的若干词（长词优先）后按字典序拼接。
 * 它同时是 NewsEvent.fingerprint 的唯一键——两条信号算出同一个指纹时，
 * 唯一约束会把它们直接摁到同一个事件上。
 *
 * **不带 topic 前缀**。带前缀时同一件事被不同主题的源报道会算出两个指纹
 *（`ai:foo` 与 `tech:foo`），而那正是最该合并的一对——跨源印证。
 */
export function buildFingerprint(tokens: string[]): string {
  const significant = [...new Set(tokens)]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, FINGERPRINT_TOKEN_LIMIT)
    .sort((a, b) => a.localeCompare(b));
  return significant.join("-");
}

/**
 * Jaccard 相似度。两边都为空时返回 0，而不是数学上的 1——空标题不该和任何东西相似。
 *
 * 已知天花板（在真实语料上量过，别再重复踩）：只看标题词集合时，下面两对同分 0.33，
 * 任何阈值都分不开它们——
 *
 *   该合并：「Stripe Clinches $7B Deal to Buy OpenRouter」⟷「Stripe will acquire OpenRouter for $7B+」
 *   不该合并：「Write your first prompt with the GitHub Copilot app」⟷「A guide to slash commands in the GitHub Copilot app」
 *
 * 试过按词的稀有度加权（IDF，语料取候选窗口）：两对分别变成 0.29 与 0.29，仍然同分，
 * 全语料新增合并 0 对——**无收益，已撤掉**。要跨过这道坎需要语义而不是词面，
 * 那正是 LLM 分析器的职责（见 MODULE.md「AI 边界」）。
 */
export function titleSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) {
    return 0;
  }
  const left = new Set(a);
  const right = new Set(b);
  let shared = 0;
  for (const token of left) {
    if (right.has(token)) {
      shared += 1;
    }
  }
  const union = left.size + right.size - shared;
  return union === 0 ? 0 : shared / union;
}

export function sharedTokenCount(a: string[], b: string[]): number {
  const right = new Set(b);
  return new Set(a).size === 0
    ? 0
    : [...new Set(a)].filter((token) => right.has(token)).length;
}

/**
 * 默认阈值。标题短时相似度天然偏高，因此对短标题要求更严。
 *
 * 这两个数是在真实语料（HN + 7 个 RSS 源、约 230 条信号）上校准出来的，
 * 换语料后应当重新校准，别凭感觉调——`shouldCluster` 的单测里钉了正反两个真实案例。
 */
export const CLUSTER_SIMILARITY_THRESHOLD = 0.4;
export const CLUSTER_SHORT_TITLE_THRESHOLD = 0.6;
const SHORT_TITLE_TOKEN_COUNT = 3;
const MIN_SHARED_TOKENS = 2;

export function shouldCluster(a: string[], b: string[]): boolean {
  if (sharedTokenCount(a, b) < MIN_SHARED_TOKENS) {
    return false;
  }
  const isShort =
    a.length <= SHORT_TITLE_TOKEN_COUNT || b.length <= SHORT_TITLE_TOKEN_COUNT;
  const threshold = isShort
    ? CLUSTER_SHORT_TITLE_THRESHOLD
    : CLUSTER_SIMILARITY_THRESHOLD;
  return titleSimilarity(a, b) >= threshold;
}

/** 从多条标题里挑一个作事件标题：优先信息量（词数）高、长度适中的那条。 */
export function pickEventTitle(titles: string[]): string {
  const ranked = [...titles]
    .map((title) => ({ title, tokens: tokenizeTitle(title).length }))
    .sort(
      (a, b) => b.tokens - a.tokens || a.title.length - b.title.length,
    );
  return ranked[0]?.title ?? "";
}
