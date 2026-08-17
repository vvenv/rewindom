import { parseFeed, type ParsedFeedItem } from "./feed-parser.js";
import { fetchText } from "./http.js";
import { truncateExcerpt } from "./page-excerpt.js";

import type { ConnectorFeed, EventConnector, RawSignal } from "./connector.js";

/** 单个源一轮最多取多少条，防止某个源的全量归档把一轮采集撑爆。 */
const ITEM_LIMIT = 40;

/**
 * 通用 RSS / Atom connector。
 *
 * 一个实现吃掉所有新闻站与官方 Blog——「加一个来源」退化成「往 EventFeed 插一行」，
 * 这是 MVP 阶段性价比最高的一步（见 MVP §12）。
 */
export const rssConnector: EventConnector = {
  id: "rss",
  fetch: async (feed: ConnectorFeed): Promise<RawSignal[]> => {
    const xml = await fetchText(feed.url, {
      // OpenAI / Hugging Face 的 feed 是全量归档（数百 KB），15s 在代理或慢链路上不够
      timeoutMs: 30_000,
      accept:
        "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
    });
    return parseFeed(xml).slice(0, ITEM_LIMIT).map((item) => toSignal(item, feed));
  },
};

export function toSignal(item: ParsedFeedItem, feed: ConnectorFeed): RawSignal {
  return {
    external_id: item.id,
    source_name: feed.name,
    source_kind: feed.source_kind,
    title: item.title,
    url: item.link,
    excerpt: truncateExcerpt(item.summary),
    author: item.author,
    topic: feed.topic,
    // RSS 不提供热度，热度只能来自「有多少源在说」与来源权重
    score: 0,
    comment_count: 0,
    // 缺日期的源用抓取时间兜底：宁可时间线上略微靠后，也不要落一个 Invalid Date
    published_at: item.published_at ?? new Date(),
  };
}
