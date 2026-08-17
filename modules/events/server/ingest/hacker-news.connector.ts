import { fetchJson } from "./http.js";

import type { ConnectorFeed, EventConnector, RawSignal } from "./connector.js";

export const HACKER_NEWS_API_BASE = "https://hacker-news.firebaseio.com/v0";

/** 取榜单前多少条。再往下翻已经不是「正在发生」，而是常驻长尾。 */
const TOP_STORY_LIMIT = 60;
/** 并发批大小——Firebase 端点没有官方限流说明，保守一点。 */
const BATCH_SIZE = 10;

interface HackerNewsItem {
  id?: number;
  type?: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  by?: string;
  time?: number;
  deleted?: boolean;
  dead?: boolean;
}

/**
 * Hacker News connector。
 *
 * 用官方 Firebase 端点，不需要任何凭据；HN 的 topstories 已经是社区筛过一轮的结果，
 * 作为第一个 connector 的信噪比最高。
 */
export const hackerNewsConnector: EventConnector = {
  id: "hackernews",
  fetch: async (feed: ConnectorFeed): Promise<RawSignal[]> => {
    const ids = await fetchJson<number[]>(
      `${HACKER_NEWS_API_BASE}/topstories.json`,
    );
    const targets = ids.slice(0, TOP_STORY_LIMIT);

    const items: HackerNewsItem[] = [];
    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      const batch = await Promise.all(
        targets.slice(i, i + BATCH_SIZE).map((id) =>
          fetchJson<HackerNewsItem | null>(
            `${HACKER_NEWS_API_BASE}/item/${id}.json`,
          ).catch(() => null),
        ),
      );
      items.push(...batch.filter((item): item is HackerNewsItem => item !== null));
    }

    return items
      .map((item) => toSignal(item, feed))
      .filter((signal): signal is RawSignal => signal !== null);
  },
};

export function toSignal(
  item: HackerNewsItem,
  feed: ConnectorFeed,
): RawSignal | null {
  if (
    item.deleted === true ||
    item.dead === true ||
    typeof item.id !== "number" ||
    typeof item.title !== "string" ||
    item.title.trim().length === 0
  ) {
    return null;
  }

  const discussionUrl = `https://news.ycombinator.com/item?id=${item.id}`;

  return {
    external_id: String(item.id),
    source_name: feed.name,
    source_kind: feed.source_kind,
    // Ask HN / Show HN 这类自帖没有外链，指回讨论页本身
    title: item.title.trim(),
    url: item.url ?? discussionUrl,
    excerpt: "",
    author: item.by ?? null,
    topic: feed.topic,
    score: item.score ?? 0,
    comment_count: item.descendants ?? 0,
    published_at:
      typeof item.time === "number" ? new Date(item.time * 1000) : new Date(),
  };
}
