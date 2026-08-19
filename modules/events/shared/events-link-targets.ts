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

import type { SiteLinkTarget } from "@rewindom/builtin/marketing/shared/site-link-target.js";

export function eventsLinkTargets(input: {
  entityIndexLabel: string;
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
  ];
}
