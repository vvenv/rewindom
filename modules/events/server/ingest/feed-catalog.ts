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
 * 这份清单在站点还没有任何采集源时写入 EventFeed —— **只在空目录时新建**：
 * 站点自己改过、关掉或换成别的源之后，不会被下一轮采集塞回来。
 */
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

  // ---- 一手来源：当事方自己说的话
  {
    connector: "rss",
    name: "OpenAI",
    url: "https://openai.com/news/rss.xml",
    source_kind: "official",
    topic: "ai",
  },
  {
    connector: "rss",
    name: "Hugging Face",
    url: "https://huggingface.co/blog/feed.xml",
    source_kind: "official",
    topic: "ai",
  },
  {
    connector: "rss",
    name: "GitHub Blog",
    url: "https://github.blog/feed/",
    source_kind: "official",
    topic: "tech",
  },

  // ---- 新闻：转述与报道
  {
    connector: "rss",
    name: "TechCrunch",
    url: "https://techcrunch.com/feed/",
    source_kind: "news",
    topic: "tech",
  },
  {
    connector: "rss",
    name: "The Verge",
    url: "https://www.theverge.com/rss/index.xml",
    source_kind: "news",
    topic: "tech",
  },
  {
    connector: "rss",
    name: "Ars Technica",
    url: "https://feeds.arstechnica.com/arstechnica/index",
    source_kind: "news",
    topic: "tech",
  },
  {
    connector: "rss",
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    source_kind: "news",
    topic: "world",
  },
];
