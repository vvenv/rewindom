import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import {
  ARTICLE_IMAGE_REPEAT_MAX,
  articleImageProxyPath,
  isUsableImageUrl,
} from "../../shared/article-image.js";
import { isFirstPartySource } from "../../shared/events.js";

import type {
  EventArticleImage,
  EventSourceKind,
} from "../../shared/index.js";

/**
 * 一条事件要画哪张图。
 *
 * 两件事：**选**（事件是多来源聚合的，得有个稳定规则）与**去噪**（一大半来源
 * 给的是站点品牌图而不是文章配图）。
 */

interface ImageCandidate {
  image_url: string | null;
  source_name: string;
  source_kind: string;
  url: string;
  published_at: Date;
}

/**
 * 排序规则：`[一手来源优先, published_at 升序]`。
 *
 * 一手来源（官方博客 / 发布页 / 状态页）的图最可能是它自己拍或画的，权属最干净；
 * 同分时取**最早**那条——后来跟进的报道更可能配一张通讯社图。
 *
 * 结果必须稳定：同一条事件每次渲染都得是同一张图，否则读者每刷新一次换一张。
 * 所以最后再按 URL 兜一层字典序，两条完全同分时也不会随查询顺序漂。
 */
export function pickImageCandidate(
  rows: readonly ImageCandidate[],
): ImageCandidate | null {
  const usable = rows.filter(
    (row) => isUsableImageUrl(row.image_url) && row.source_name.trim(),
  );
  if (usable.length === 0) {
    return null;
  }
  return [...usable].sort((a, b) => {
    const aFirst = isFirstPartySource(a.source_kind as EventSourceKind);
    const bFirst = isFirstPartySource(b.source_kind as EventSourceKind);
    if (aFirst !== bFirst) return aFirst ? -1 : 1;
    const byTime = a.published_at.getTime() - b.published_at.getTime();
    if (byTime !== 0) return byTime;
    return (a.image_url ?? "").localeCompare(b.image_url ?? "");
  })[0];
}

/**
 * 事件详情页的插图。没有可用的就是 `null`，整块不画。
 *
 * 去噪那一步是这套东西能不能看的关键：实测语料里一大半 `og:image` 是站点品牌图
 *（OpenAI Blog 的十条事件共用一张），画出来比不画更糟——读者会以为页面串了。
 * 判据不猜尺寸（要下载才知道），而是数**同一来源下这个 URL 出现了几次**。
 * 一次分组查询，而且自纠正：源换了品牌图，旧的自然掉出窗口。
 */
export async function getEventArticleImage(
  tenantId: string,
  eventId: string,
): Promise<EventArticleImage | null> {
  const rows = await prisma.eventSignal.findMany({
    where: withTenantScope(tenantId, {
      event_id: eventId,
      removed_at: null,
      NOT: { image_url: null },
    }),
    select: {
      image_url: true,
      source_name: true,
      source_kind: true,
      url: true,
      published_at: true,
    },
  });

  const picked = pickImageCandidate(rows);
  if (!picked?.image_url) {
    return null;
  }

  /*
   * 两条独立的去噪判据，命中任一条就丢掉：
   *
   * 1. **同一来源反复用同一张** —— 站点品牌卡片。实测本地语料 6353 条信号里，
   *    这一条抓出 397 张（占有图的 37%）：Slack Status 的 logo 出现 22 次、
   *    CFPB 的 open-graph 图 16 次。
   * 2. **同一张被不同来源共用** —— 那就一定不是某篇文章的照片。Statuspage 托管的
   *    那个 cloudfront favicon 被 Twilio / Atlassian / npm / Dropbox / Discord
   *    五家状态页共用；只出过一两次故障的源会从判据 1 漏过去，被这条接住。
   *
   * 两条都是**自纠正**的：源换了品牌图，旧的自然掉出窗口。
   */
  const [repeats, sharingSources] = await Promise.all([
    prisma.eventSignal.count({
      where: withTenantScope(tenantId, {
        source_name: picked.source_name,
        image_url: picked.image_url,
      }),
    }),
    prisma.eventSignal.findMany({
      where: withTenantScope(tenantId, { image_url: picked.image_url }),
      select: { source_name: true },
      distinct: ["source_name"],
      // 只要问「是不是超过一家」，不必把全部来源捞回来
      take: 2,
    }),
  ]);
  if (repeats >= ARTICLE_IMAGE_REPEAT_MAX || sharingSources.length > 1) {
    return null;
  }

  return {
    url: picked.image_url,
    fallback_url: articleImageProxyPath(picked.image_url),
    source_name: picked.source_name,
    source_href: picked.url,
  };
}
