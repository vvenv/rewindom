/**
 * events → newsletter 的内容源。
 *
 * 依赖方向单向：本模块 import newsletter 的**契约**并注册自己，newsletter 永远不认识
 * events——它拿到的只是一串 `list_key` 和一堆 `{ title, url, summary, published_at }`。
 * 与本模块给 translation 注册 `TranslationTermsProvider` 是同一套做法。
 *
 * 本模块**不出现任何订阅 UI**：订阅表单是 newsletter 贡献给站点的段，租户在
 * Theme Editor 里把它拖到 `/events` 页上就有了。
 */
import {
  registerNewsletterSource,
  type NewsletterItem,
  type NewsletterItemsResult,
  type NewsletterList,
  type NewsletterSource,
} from "@rewindom/newsletter/shared/index.js";

import { isEventsEnabled } from "./lib/entitlement.js";

import { EVENT_TOPICS, type EventTopic } from "../shared/events.js";
import { eventPath } from "../shared/events-public-paths.js";

import { getEnabledTopics } from "./event/topic-settings.service.js";

import { getSiteDefaultLocale } from "@rewindom/builtin/marketing/server/site.service.js";
import { withSiteLocale } from "@rewindom/builtin/marketing/shared/site-locale.js";
import {
  normalizeLocale,
  prisma,
  translateServerMessage,
  withTenantScope,
} from "@rewindom/module-sdk/server";

/** 全站列表。 */
export const EVENTS_LIST_ALL = "events:all";
const TOPIC_PREFIX = "events:topic:";
const ENTITY_PREFIX = "events:entity:";

/**
 * 贡献方自己的硬上限。newsletter 会传 limit，但一个沉寂三个月的列表突然被拉一次，
 * 不能把三个月的事件全灌进一封信——超出部分靠 `next_cursor` 留给下一轮。
 */
const HARD_LIMIT = 50;

export function eventsTopicList(topic: EventTopic): string {
  return `${TOPIC_PREFIX}${topic}`;
}

export function eventsEntityList(slug: string): string {
  return `${ENTITY_PREFIX}${slug}`;
}

/**
 * 游标 = `first_seen_at ISO|id`。
 *
 * **复合而不是纯时间戳**：同一毫秒有多条事件时，纯时间戳要么漏发要么重发。
 */
interface Cursor {
  at: Date;
  id: string;
}

export function parseCursor(raw: string | null): Cursor | null {
  if (!raw) return null;
  const [at, id] = raw.split("|");
  if (!at || !id) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : { at: date, id };
}

export function formatCursor(item: {
  first_seen_at: Date;
  id: string;
}): string {
  return `${item.first_seen_at.toISOString()}|${item.id}`;
}

function listLabel(listKey: string, locale: string): string {
  const lng = normalizeLocale(locale);
  if (listKey === EVENTS_LIST_ALL) {
    return translateServerMessage(lng, { code: "events.list.all" });
  }
  if (listKey.startsWith(TOPIC_PREFIX)) {
    const topic = listKey.slice(TOPIC_PREFIX.length);
    return translateServerMessage(lng, { code: `events.topic.${topic}` });
  }
  // 实体列表不进候选清单，标签退化成 slug——它只在邮件页脚出现一次
  return listKey.slice(ENTITY_PREFIX.length) || listKey;
}

async function buildWhere(
  tenantId: string,
  listKey: string,
  cursor: Cursor | null,
): Promise<Record<string, unknown> | null> {
  const base: Record<string, unknown> = {};

  if (listKey.startsWith(TOPIC_PREFIX)) {
    const topic = listKey.slice(TOPIC_PREFIX.length);
    if (!(EVENT_TOPICS as readonly string[]).includes(topic)) return null;
    base.topic = topic;
  } else if (listKey.startsWith(ENTITY_PREFIX)) {
    const slug = listKey.slice(ENTITY_PREFIX.length);
    if (!slug) return null;
    base.entities = { some: { entity: { slug } } };
  } else if (listKey !== EVENTS_LIST_ALL) {
    return null;
  }

  if (cursor) {
    /*
     * 复合游标的「大于」：先比时间，时间相同再比 id。
     * 写成 `first_seen_at > at` 会漏掉同一毫秒里 id 更大的那几条。
     */
    base.OR = [
      { first_seen_at: { gt: cursor.at } },
      { first_seen_at: cursor.at, id: { gt: cursor.id } },
    ];
  }

  return withTenantScope(tenantId, base) as Record<string, unknown>;
}

export const eventsNewsletterSource: NewsletterSource = {
  id: "events",

  /**
   * 候选清单只给**全站 + 已启用主题**。
   *
   * 实体是几千个量级，全塞进订阅段的下拉框会让租户在编辑器里翻到崩溃；但
   * `ownsList` / `listItemsSince` **认得** `events:entity:<slug>`，实体页上的订阅段
   * 可以把当前实体的 key 填进去（与 RSS 那边「按上下文取址」同一个思路）。
   */
  async listLists({ tenant_id, locale }): Promise<NewsletterList[]> {
    // 事件雷达关掉的站点不该出现在订阅候选里（两道 entitlement 各管各的）
    if (!(await isEventsEnabled(tenant_id))) return [];

    const lists: NewsletterList[] = [
      {
        list_key: EVENTS_LIST_ALL,
        label: listLabel(EVENTS_LIST_ALL, locale),
        description: translateServerMessage(normalizeLocale(locale), {
          code: "events.list.allDescription",
        }),
      },
    ];
    for (const topic of await getEnabledTopics(tenant_id)) {
      const listKey = eventsTopicList(topic);
      lists.push({ list_key: listKey, label: listLabel(listKey, locale) });
    }
    return lists;
  },

  ownsList(listKey: string): boolean {
    return (
      listKey === EVENTS_LIST_ALL ||
      listKey.startsWith(TOPIC_PREFIX) ||
      listKey.startsWith(ENTITY_PREFIX)
    );
  },

  /**
   * 游标之后**新出现**的事件。
   *
   * 刻意只发新事件，不发「又有新进展了」：RSS 那边 pubDate 用 `last_activity_at`
   * 是对的（RSS 是流），但邮件不是——事件会被反复合并、反复更新，用
   * `last_activity_at` 当游标的话，同一条事件会在连续几周的摘要里反复出现，
   * 读者第三次看到就退订了。追更是第二期，要一套「上次告诉过你什么」的按人状态。
   */
  async listItemsSince({
    tenant_id,
    list_key,
    locale,
    cursor,
    limit,
  }): Promise<NewsletterItemsResult> {
    if (!(await isEventsEnabled(tenant_id))) {
      return { items: [], next_cursor: cursor };
    }

    const where = await buildWhere(tenant_id, list_key, parseCursor(cursor));
    if (!where) return { items: [], next_cursor: cursor };

    const take = Math.max(1, Math.min(limit, HARD_LIMIT));
    const records = await prisma.newsEvent.findMany({
      where,
      // 与游标同序，否则「上一轮取到哪」就没有意义
      orderBy: [{ first_seen_at: "asc" }, { id: "asc" }],
      take,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        first_seen_at: true,
      },
    });

    if (records.length === 0) return { items: [], next_cursor: cursor };

    const lng = normalizeLocale(locale);
    const defaultLocale = await getSiteDefaultLocale(tenant_id);
    const items: NewsletterItem[] = records.map((record) => ({
      id: record.id,
      title: record.title,
      /*
       * **相对路径**：绝对化由 newsletter 拼站点 origin。这里只保证语言前缀正确——
       * 默认语言不带前缀，其余语言带（`withSiteLocale` 的口径）。
       */
      url: withSiteLocale(eventPath(record.slug), lng, defaultLocale),
      // 摘要用现成字段，不为邮件另跑一次 LLM（llm-cost-trim 那条口径继续生效）
      summary: record.summary || undefined,
      published_at: record.first_seen_at.toISOString(),
    }));

    return {
      items,
      next_cursor: formatCursor(records[records.length - 1]!),
    };
  },
};

/** 在模块 `onBoot` 里调。 */
export function registerEventsNewsletterSource(): void {
  registerNewsletterSource(eventsNewsletterSource);
}
