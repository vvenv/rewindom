import { describe, expect, it } from "vitest";

import {
  EVENT_TOPICS,
  isFirstPartySource,
  isIconHost,
  sourceIconHost,
} from "../../shared/index.js";

import { isEntityKind } from "../event/entity-extractor.js";

import { DEFAULT_FEEDS, feedCatalogKey } from "./feed-catalog.js";

/**
 * 验证过、且**明确判定不该进目录**的地址。理由见
 * `features/feed-catalog-breadth.spec.yaml`。
 *
 * 这一条是回归闸门而不是结构规则：Google 那个案例（站点级 feed 与已有的 AI 分类
 * feed 产出同一批文章 URL）在路径上看不出父子关系，`/rss/` 与
 * `/technology/ai/rss/` 谁也不是谁的前缀。结构判据抓不到它，只能把结论钉死。
 */
const REJECTED: ReadonlyArray<{ url: string; why: string }> = [
  {
    url: "https://blog.google/rss/",
    why: "与目录里的 Google AI Blog 产出同一批文章 URL（实测 20 条里 2 条重合），会让 Google 一家算成两个来源、虚增 source_count",
  },
  {
    url: "https://www.elastic.co/blog/feed",
    why: "40 条不按时间倒序，ITEM_LIMIT 从头切只会拿到陈旧条目",
  },
  {
    url: "https://www.cloudflarestatus.com/history.atom",
    why: "与目录里的 Cloudflare Status 是同一个状态页，只是 atom 变体",
  },
  {
    url: "https://www.zdnet.com/topic/artificial-intelligence/rss.xml",
    why: "302 到 zdnet.com/news/rss.xml，根本不是 AI feed——按地址判会以为补了一个 ai 报道源",
  },
  {
    url: "https://dev.to/feed",
    why: "个人博客文章，不是事件；20 万字节 12 条，全文正文喂进聚类只会稀释判据",
  },
  {
    url: "https://www.producthunt.com/feed",
    why: "产品目录不是事件，条目终生单信号且标题模板化（与状态页同一类失效）",
  },
  {
    url: "https://lemmy.world/feeds/c/technology.xml?sort=Active",
    why: "Active 不按时间倒序（实测头五条 23/24/23/24/25 日），ITEM_LIMIT 从头切会让刚发的帖一直进不来——与 elastic.co/blog/feed 同一条失效。目录里用的是 ?sort=New",
  },
];

describe("DEFAULT_FEEDS", () => {
  it("每个目录项的 key 唯一——重复 URL 会让种植记账对不上", () => {
    const keys = DEFAULT_FEEDS.map(feedCatalogKey);
    expect(keys).toEqual([...new Set(keys)]);
  });

  it("每个 topic 至少 3 个源，ai / tech / business 更密，其余四格也能跨源印证", () => {
    const counts = Object.fromEntries(
      EVENT_TOPICS.map((topic) => [
        topic,
        DEFAULT_FEEDS.filter((feed) => feed.topic === topic).length,
      ]),
    ) as Record<(typeof EVENT_TOPICS)[number], number>;

    for (const topic of EVENT_TOPICS) {
      expect(counts[topic], topic).toBeGreaterThanOrEqual(3);
    }
    expect(counts.ai).toBeGreaterThanOrEqual(28);
    expect(counts.tech).toBeGreaterThanOrEqual(95);
    expect(counts.business).toBeGreaterThanOrEqual(20);
    expect(counts.world).toBeGreaterThanOrEqual(15);
    expect(counts.gaming).toBeGreaterThanOrEqual(14);
    expect(counts.entertainment).toBeGreaterThanOrEqual(14);
    expect(counts.sports).toBeGreaterThanOrEqual(8);
  });

  /**
   * 只有一手来源能让单条信号判到 confirmed（见 why-trending）。一整格全是报道时，
   * 那一格的事件永远只能落 discussion 或等第二家媒体跟进。
   * sports / entertainment 曾经就是这个状态，补上联盟与片方的公告才走出来。
   */
  it("每个 topic 都有一手来源，不存在清一色报道的格子", () => {
    for (const topic of EVENT_TOPICS) {
      const firstParty = DEFAULT_FEEDS.filter(
        (feed) => feed.topic === topic && isFirstPartySource(feed.source_kind),
      );
      expect(firstParty.length, topic).toBeGreaterThanOrEqual(1);
    }
  });

  it("验证过判定不该进目录的地址没有被加回来", () => {
    const urls = new Set(DEFAULT_FEEDS.map((feed) => feed.url));
    for (const { url, why } of REJECTED) {
      expect(urls.has(url), `${url} —— ${why}`).toBe(false);
    }
  });

  /**
   * 出版方实体是归位与累计档案在 release / status / official 这批事件上
   * 能不能长出来的**前提**——它们的实体不用猜，就是这个源自己。
   * 忘了填不会报错，只会让那批事件继续没有实体，所以在这里钉住。
   */
  it("每个一手来源目录项都标了出版方实体", () => {
    for (const feed of DEFAULT_FEEDS) {
      if (!isFirstPartySource(feed.source_kind)) {
        continue;
      }
      expect(feed.publisher_entity?.name, feed.name).toBeTruthy();
      expect(isEntityKind(feed.publisher_entity?.kind), feed.name).toBe(true);
    }
  });

  /**
   * 反过来也要守住：一篇 TechCrunch 报道不是「关于 TechCrunch」的。
   * 给 news / community 源标出版方会把每个媒体变成一个实体聚合面。
   */
  it("news / community 源不许标出版方", () => {
    for (const feed of DEFAULT_FEEDS) {
      if (isFirstPartySource(feed.source_kind)) {
        continue;
      }
      expect(feed.publisher_entity, feed.name).toBeUndefined();
    }
  });

  /**
   * 合并率的上限由目录形状决定，而**只有 news / community 参与文本聚类**
   *（一手来源按 `clustersByUrlOnly` 只按 URL 归属，结构上恒为单信号）。
   *
   * 所以下限要钉在这两格上，不能只钉每个 topic 的总数——总数已经被一手来源
   * 撑着，钉总数等于在奖励「继续加 official」这个动作，而那正是让合并率
   * 下降的方向：本地库 4073 个事件里 4063 个只有一个 source_kind。
   *
   * ai 那一格曾经是 28 个一手来源对 3 个报道源——最容易出事的一格，
   * 最没人跟进。
   */
  it("参与文本聚类的那两格有密度：ai 报道 ≥5、tech 社区 ≥3", () => {
    const mergeable = (topic: string, kind: string) =>
      DEFAULT_FEEDS.filter(
        (feed) => feed.topic === topic && feed.source_kind === kind,
      ).length;

    expect(mergeable("ai", "news")).toBeGreaterThanOrEqual(5);
    expect(mergeable("tech", "news")).toBeGreaterThanOrEqual(10);
    expect(mergeable("tech", "community")).toBeGreaterThanOrEqual(3);
  });

  it("每个目录源都能推出公网 icon host", () => {
    for (const feed of DEFAULT_FEEDS) {
      const host = sourceIconHost(feed);
      expect(host, feed.name).toBeTruthy();
      expect(isIconHost(host ?? ""), feed.name).toBe(true);
    }
  });
});
