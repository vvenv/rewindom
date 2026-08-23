/**
 * 编辑器「从站内选」的候选：实体枢纽 + 对外 RSS。
 *
 * 单个事件 / 实体 feed 不进下拉——条数会把列表淹掉。主题 RSS 是编译期七格，列得下。
 * 站点首页已经在 CMS 页列表里，不再重复一条「事件枢纽」。
 *
 * 「当前主题 RSS」存的是 `{feed}`：渲染期换成当前页该订的那条。
 */

import { EVENT_TOPICS, type EventTopic } from "./events.js";
import {
  EVENTS_FEED_HREF_TEMPLATE,
  entityIndexPath,
  eventsFeedPath,
} from "./events-section-context.js";

import { EVENTS_DETAIL_PAGE_KIND } from "./events-detail-section.js";
import { EVENTS_ENTITY_PAGE_KIND } from "./events-entity-section.js";
import { EVENTS_TOPIC_PAGE_KIND } from "./events-page-templates.js";

import { NEWSLETTER_SUBSCRIBE_PATH } from "@rewindom/newsletter/shared/newsletter-page-templates.js";

import type { SiteLinkTarget } from "@rewindom/builtin/marketing/shared/site-link-target.js";

export function eventsLinkTargets(input: {
  entityIndexLabel: string;
  /** 「订阅当前主题（邮件）」。 */
  currentTopicSubscribeLabel: string;
  /** 「订阅当前实体（邮件）」。 */
  currentEntitySubscribeLabel: string;
  currentTopicFeedLabel: string;
  siteFeedLabel: string;
  topicFeedLabel: (topicName: string) => string;
  topicName: (topic: EventTopic) => string;
  topics?: readonly EventTopic[];
}): SiteLinkTarget[] {
  const topics = input.topics ?? EVENT_TOPICS;
  return [
    {
      value: entityIndexPath(),
      label: input.entityIndexLabel,
      group: "page",
    },
    {
      value: EVENTS_FEED_HREF_TEMPLATE,
      label: input.currentTopicFeedLabel,
      group: "feed",
    },
    {
      value: eventsFeedPath(),
      label: input.siteFeedLabel,
      group: "feed",
    },
    ...topics.map((topic) => ({
      value: eventsFeedPath(topic),
      label: input.topicFeedLabel(input.topicName(topic)),
      group: "feed" as const,
    })),
    /*
     * 邮件订阅：跳到订阅页并**带上当前页的范围**。
     *
     * 值里是整串 `{topic_list}` 而不是拼出来的 `events:topic:{topic_slug}`——
     * `collapseQuery` 只在整个查询值为空时才丢掉那个参数，拼起来的话没有主题的
     * 页面上会剩下 `list=events:topic:` 这种残缺却「非空」的 key。整串作为一个
     * token，空就是空，地址干净地退化成 `/subscribe`（订全站）。
     *
     * 具体主题各来一条**不列**：与上面单个事件 feed 同一条理由——七个主题再乘一遍
     * 只会把候选淹掉，而「当前主题」这一条摆在主题模板页上就覆盖了全部七个。
     */
    {
      value: `${NEWSLETTER_SUBSCRIBE_PATH}?list={topic_list}`,
      label: input.currentTopicSubscribeLabel,
      group: "page",
      // 与 `{topic_list}` token 的 page_kinds 逐字一致——两处对不上就会列出一条
      // 参数永远为空的候选，读者点过去订的是全站而不是这个主题
      page_kinds: [EVENTS_TOPIC_PAGE_KIND, EVENTS_DETAIL_PAGE_KIND],
    },
    {
      value: `${NEWSLETTER_SUBSCRIBE_PATH}?list={entity_list}`,
      label: input.currentEntitySubscribeLabel,
      group: "page",
      page_kinds: [EVENTS_ENTITY_PAGE_KIND],
    },
  ];
}
