import type { EventSourceKind, EventTopic } from "../../shared/index.js";

export interface FeedSeed {
  connector: string;
  name: string;
  url: string;
  source_kind: EventSourceKind;
  topic: EventTopic;
}

/**
 * 内置采集源目录。
 *
 * 一期只接 Hacker News 与 RSS/Atom 两个 connector（见 MVP §12：不追求全网）。
 *
 * 种植口径见 `feed-seed.ts`：按**目录项的 key** 记录「这个站点种过什么」，
 * 只种从未种过的——既能给存量站点补新源，又不会把站点删掉的源塞回来。
 *
 * 为什么要铺到这个量：跨源印证是这个产品的核心，而它受制于
 * 「HN 上那条帖子有没有第二个源覆盖到」。8 个源时线上 16 张卡有 13 张只有单一来源。
 * 每个 topic 至少 3 个源——单源 topic 的事件永远无法跨源印证，等于白占一个筛选项。
 * entertainment / sports 没有 official 源：这两类没有「当事方自己发公告」的等价物，
 * 硬凑一个不如空着。
 *
 * 目录里的每个 URL 都实际请求验证过。**已知在部分网络环境下不可达**：
 * `GitHub Blog` 与 `Hugging Face` 在本地会 `terminated`（连接被中断，不是 404），
 * 生产机房可能正常——这是既有目录里就存在的现象，不是新增源引入的。
 * 单个源失败不影响整轮采集，错误记在 `EventFeed.last_error` 上。
 *
 * **非新闻源**（release / status / filing）是刻意的差异化落点，见文件末尾那一组。
 * 它们的存在也解释了目录里为什么会有「同一家公司两条源」——博客是它在说什么，
 * 状态页是它的系统在发生什么，两者不是一回事。
 *
 * 中文源仍然不加：分词器对中文走二元切分、对英文走词切分，
 * 中英标题 token 交集恒为 0。语义层已经就位（见 MODULE.md「语义聚类」），
 * 但跨语言合并要单独校准阈值，属于独立决策。
 */

/** 目录项的稳定身份。改 name / source_kind 不会让站点重新种一遍。 */
export function feedCatalogKey(feed: {
  connector: string;
  url: string;
}): string {
  return `${feed.connector}:${feed.url}`;
}
export const HACKER_NEWS_API_ROOT = "https://hacker-news.firebaseio.com/v0";

export const DEFAULT_FEEDS: readonly FeedSeed[] = [
  {
    connector: "hackernews",
    name: "Hacker News",
    // 内置 connector 不读这个地址，只是拿它当唯一键
    url: HACKER_NEWS_API_ROOT,
    source_kind: "community",
    topic: "tech",
  },

  // ---- ai · 一手来源：当事方自己说的话
  { connector: "rss", name: "OpenAI", url: "https://openai.com/news/rss.xml", source_kind: "official", topic: "ai" },
  { connector: "rss", name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", source_kind: "official", topic: "ai" },
  { connector: "rss", name: "Google Research", url: "https://research.google/blog/rss/", source_kind: "official", topic: "ai" },
  { connector: "rss", name: "DeepMind", url: "https://deepmind.google/blog/rss.xml", source_kind: "official", topic: "ai" },
  { connector: "rss", name: "AWS Machine Learning", url: "https://aws.amazon.com/blogs/machine-learning/feed/", source_kind: "official", topic: "ai" },
  // ---- ai · 报道
  { connector: "rss", name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", source_kind: "news", topic: "ai" },

  // ---- tech · 一手来源
  { connector: "rss", name: "GitHub Blog", url: "https://github.blog/feed/", source_kind: "official", topic: "tech" },
  { connector: "rss", name: "Cloudflare Blog", url: "https://blog.cloudflare.com/rss/", source_kind: "official", topic: "tech" },
  { connector: "rss", name: "Mozilla Hacks", url: "https://hacks.mozilla.org/feed/", source_kind: "official", topic: "tech" },
  { connector: "rss", name: "Chromium Blog", url: "https://blog.chromium.org/feeds/posts/default", source_kind: "official", topic: "tech" },
  { connector: "rss", name: "Rust Blog", url: "https://blog.rust-lang.org/feed.xml", source_kind: "official", topic: "tech" },
  { connector: "rss", name: "Stack Overflow Blog", url: "https://stackoverflow.blog/feed/", source_kind: "official", topic: "tech" },
  // ---- tech · 报道
  { connector: "rss", name: "TechCrunch", url: "https://techcrunch.com/feed/", source_kind: "news", topic: "tech" },
  { connector: "rss", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", source_kind: "news", topic: "tech" },
  { connector: "rss", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", source_kind: "news", topic: "tech" },
  { connector: "rss", name: "Hacker Noon", url: "https://hackernoon.com/feed", source_kind: "news", topic: "tech" },
  { connector: "rss", name: "Engadget", url: "https://www.engadget.com/rss.xml", source_kind: "news", topic: "tech" },

  // ---- business
  { connector: "rss", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", source_kind: "news", topic: "business" },
  { connector: "rss", name: "Financial Times", url: "https://www.ft.com/rss/home", source_kind: "news", topic: "business" },
  { connector: "rss", name: "SEC Press Releases", url: "https://www.sec.gov/news/pressreleases.rss", source_kind: "filing", topic: "business" },
  // Akamai 会拦阅读器 UA，采集出口对 ftc.gov 改用浏览器族 UA（见 http.ts）
  { connector: "rss", name: "FTC Press Releases", url: "https://www.ftc.gov/feeds/press-release.xml", source_kind: "filing", topic: "business" },

  // ---- world
  { connector: "rss", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", source_kind: "news", topic: "world" },
  { connector: "rss", name: "NPR World", url: "https://feeds.npr.org/1004/rss.xml", source_kind: "news", topic: "world" },
  { connector: "rss", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", source_kind: "news", topic: "world" },
  { connector: "rss", name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", source_kind: "official", topic: "world" },
  { connector: "rss", name: "WHO Newsroom", url: "https://www.who.int/rss-feeds/news-english.xml", source_kind: "official", topic: "world" },

  // ---- gaming
  { connector: "rss", name: "Polygon", url: "https://www.polygon.com/rss/index.xml", source_kind: "news", topic: "gaming" },
  { connector: "rss", name: "Eurogamer", url: "https://www.eurogamer.net/feed", source_kind: "news", topic: "gaming" },
  { connector: "rss", name: "PlayStation Blog", url: "https://blog.playstation.com/feed/", source_kind: "official", topic: "gaming" },
  { connector: "rss", name: "Xbox Wire", url: "https://news.xbox.com/en-us/feed/", source_kind: "official", topic: "gaming" },

  // ---- entertainment
  { connector: "rss", name: "Variety", url: "https://variety.com/feed/", source_kind: "news", topic: "entertainment" },
  { connector: "rss", name: "The Hollywood Reporter", url: "https://www.hollywoodreporter.com/feed/", source_kind: "news", topic: "entertainment" },
  { connector: "rss", name: "BBC Entertainment", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", source_kind: "news", topic: "entertainment" },

  // ---- sports
  { connector: "rss", name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", source_kind: "news", topic: "sports" },
  { connector: "rss", name: "ESPN", url: "https://www.espn.com/espn/rss/news", source_kind: "news", topic: "sports" },
  { connector: "rss", name: "Sky Sports", url: "https://www.skysports.com/rss/12040", source_kind: "news", topic: "sports" },

  /*
   * ---- 非新闻源 ----
   *
   * 竞品结构上不收这些——它们不是「新闻」。而对读者「这家昨天上线了什么、
   * 刚出过什么故障」往往比「媒体写了什么」更有用，这正是躲开对方强项的落点。
   *
   * 三类都有现成 RSS/Atom，现有 rss connector 直接吃，不需要新 connector。
   * 它们只按 canonical_url 归属，不参与文本聚类（见 shared 的 clustersByUrlOnly），
   * 也不进 Rising（恒为单来源，见 CROSS_SOURCE_KINDS）。
   */

  // ---- release · GitHub 的 releases.atom，每条 release 一个独立 permalink
  { connector: "rss", name: "Kubernetes Releases", url: "https://github.com/kubernetes/kubernetes/releases.atom", source_kind: "release", topic: "tech" },
  { connector: "rss", name: "Rust Releases", url: "https://github.com/rust-lang/rust/releases.atom", source_kind: "release", topic: "tech" },
  { connector: "rss", name: "Node.js Releases", url: "https://github.com/nodejs/node/releases.atom", source_kind: "release", topic: "tech" },
  { connector: "rss", name: "Go Releases", url: "https://github.com/golang/go/releases.atom", source_kind: "release", topic: "tech" },
  { connector: "rss", name: "Python Releases", url: "https://github.com/python/cpython/releases.atom", source_kind: "release", topic: "tech" },

  // ---- status · Statuspage 的 history.rss，每次故障一个独立 permalink
  { connector: "rss", name: "GitHub Status", url: "https://www.githubstatus.com/history.rss", source_kind: "status", topic: "tech" },
  { connector: "rss", name: "Cloudflare Status", url: "https://www.cloudflarestatus.com/history.rss", source_kind: "status", topic: "tech" },
  { connector: "rss", name: "npm Status", url: "https://status.npmjs.org/history.rss", source_kind: "status", topic: "tech" },
  { connector: "rss", name: "Slack Status", url: "https://status.slack.com/feed/rss", source_kind: "status", topic: "tech" },
  { connector: "rss", name: "OpenAI Status", url: "https://status.openai.com/history.rss", source_kind: "status", topic: "ai" },
  { connector: "rss", name: "Anthropic Status", url: "https://status.anthropic.com/history.rss", source_kind: "status", topic: "ai" },
];
