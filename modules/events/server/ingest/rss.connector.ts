import { parseFeed, type ParsedFeedItem } from "./feed-parser.js";
import { fetchText } from "./http.js";

import type { ConnectorFeed, EventConnector, RawSignal } from "./connector.js";

/** 单个源一轮最多取多少条，防止某个源的全量归档把一轮采集撑爆。 */
const ITEM_LIMIT = 40;
const EXCERPT_MAX_LENGTH = 600;

/**
 * 通用 RSS / Atom connector。
 *
 * 一个实现吃掉所有新闻站与官方 Blog——「加一个来源」退化成「往 EventFeed 插一行」，
 * 这是 MVP 阶段性价比最高的一步（见 MVP §12）。
 */
export const rssConnector: EventConnector = {
  id: "rss",
  fetch: async (feed: ConnectorFeed): Promise<RawSignal[]> => {
    const xml = await fetchText(feed.url, { accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8" });
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
    excerpt: item.summary.slice(0, EXCERPT_MAX_LENGTH),
    author: item.author,
    topic: feed.topic,
    // RSS 不提供热度，热度只能来自「有多少源在说」与来源权重
    score: 0,
    comment_count: 0,
    // 缺日期的源用抓取时间兜底：宁可时间线上略微靠后，也不要落一个 Invalid Date
    published_at: item.published_at ?? new Date(),
  };
}
