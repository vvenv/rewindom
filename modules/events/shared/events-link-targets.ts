/**
 * 编辑器「从站内选」的候选：事件枢纽页 + 对外 RSS。
 *
 * 单个事件 / 实体 feed 不进下拉——条数会把列表淹掉，也没人会把手动导航钉到
 * 某一条事件上。主题 RSS 是编译期七格，列得下。
 *
 * 「当前主题 RSS」存的是 `/events/{topic_slug}/feed.xml`：稳定、看得见、渲染期
 * 解析。空段收掉之后站点首页是全站 feed。钉死某一格仍用下面那些静态地址。
 */

import { EVENT_TOPICS, type EventTopic } from "./events.js";
import {
  EVENTS_FEED_HREF_TEMPLATE,
  EVENTS_INDEX_PATH,
  entityIndexPath,
  eventsFeedPath,
} from "./events-section-context.js";

import type { SiteLinkTarget } from "@rewindom/builtin/marketing/shared/site-link-target.js";

export function eventsLinkTargets(input: {
  indexLabel: string;
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
      value: EVENTS_INDEX_PATH,
      label: input.indexLabel,
      group: "page",
    },
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
