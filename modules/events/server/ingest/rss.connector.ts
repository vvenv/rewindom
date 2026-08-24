import { isFirstPartySource } from "../../shared/index.js";

import { parseFeed, type ParsedFeedItem } from "./feed-parser.js";
import { fetchText } from "./http.js";
import { parseIncidentUpdates } from "./incident-updates.js";
import { truncateExcerpt } from "./page-excerpt.js";

import type { ConnectorFeed, EventConnector, RawSignal } from "./connector.js";

/** 单个源一轮最多取多少条，防止某个源的全量归档把一轮采集撑爆。 */
const ITEM_LIMIT = 40;

/**
 * 正文要比 teaser 长出这么多才值得换。
 *
 * 有些源两个标签放的是同一段话，换过去只是多绕一圈；长度接近时保持 teaser——
 * 失效方向留在原地。teaser 为空时这道门槛同时也是「正文短得没意义就别用」。
 */
const FULL_CONTENT_MIN_GAIN = 120;

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
    return parseFeed(xml)
      .slice(0, ITEM_LIMIT)
      .map((item) => toSignal(item, feed));
  },
};

export function toSignal(item: ParsedFeedItem, feed: ConnectorFeed): RawSignal {
  /*
   * 状态页的正文是一条**完整的、带时刻的一手时间线**（`11:42 Resolved - …
   * 10:58 Investigating - …`）。解析必须发生在 truncateExcerpt 之前——
   * 600 字之后的部分过了那一行就永远丢了，而一次故障的正文经常上千字。
   */
  const incidentUpdates =
    feed.source_kind === "status"
      ? parseIncidentUpdates(item.summary, item.published_at ?? new Date())
      : [];

  return {
    ...(incidentUpdates.length > 0
      ? { incident_updates: incidentUpdates }
      : {}),
    external_id: item.id,
    source_name: feed.name,
    source_kind: feed.source_kind,
    title: item.title,
    url: item.link,
    excerpt: truncateExcerpt(
      pickExcerptSource(item, feed, incidentUpdates.length > 0),
    ),
    author: item.author,
    topic: feed.topic,
    // RSS 不提供热度，热度只能来自「有多少源在说」与来源权重
    score: 0,
    comment_count: 0,
    // 缺日期的源用抓取时间兜底：宁可时间线上略微靠后，也不要落一个 Invalid Date
    published_at: item.published_at ?? new Date(),
  };
}

/**
 * teaser 还是正文？
 *
 * **只有一手来源换正文**。媒体的 `content:encoded` 常常是整篇文章（含广告位与
 * 「相关阅读」列表），截 600 字得到的是导语加一段噪声，不如它自己写的 teaser；
 * 而官方公告 / 发版说明 / 监管文件的正文第一段往往正是「发生了什么」。
 *
 * 状态页解析出一手更新序列时**一律用原 description**：那条序列就是从这段文本里
 * 解析出来的，摘录换成别处会让详情页上「嵌套的那几格」与摘录说的不是一回事。
 */
function pickExcerptSource(
  item: ParsedFeedItem,
  feed: ConnectorFeed,
  hasIncidentUpdates: boolean,
): string {
  if (hasIncidentUpdates || !isFirstPartySource(feed.source_kind)) {
    return item.summary;
  }
  return item.content.length >= item.summary.length + FULL_CONTENT_MIN_GAIN
    ? item.content
    : item.summary;
}
