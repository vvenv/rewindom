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
 * 这份清单在启动时 upsert 进 EventFeed —— **只新建，不覆盖**：运维在库里禁用或改过的源
 * 不会被下次启动重新打开。要加源，往库里插一行即可，不必改代码。
 */
export const DEFAULT_FEEDS: readonly FeedSeed[] = [
  {
    connector: "hackernews",
    name: "Hacker News",
    // 内置 connector 不读这个地址，只是拿它当唯一键
    url: "https://hacker-news.firebaseio.com/v0",
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
