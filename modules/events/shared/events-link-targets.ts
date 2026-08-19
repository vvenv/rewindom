/**
 * 编辑器「从站内选」的候选：事件枢纽页 + 对外 RSS。
 *
 * 单个事件 / 实体 feed 不进下拉——条数会把列表淹掉，也没人会把手动导航钉到
 * 某一条事件上。主题 RSS 是编译期七格，列得下。
 *
 * 「本页 RSS」不是这里的一项：存进 setting 的必须是稳定 href。跟当前页走的订阅
 * 是没有链接控件的那颗按钮（hero / chrome），地址走 `eventsSubscribeHref`。
 */

import { EVENT_TOPICS, type EventTopic } from "./events.js";
import {
  EVENTS_INDEX_PATH,
  entityIndexPath,
  eventsFeedPath,
} from "./events-section-context.js";

import type { SiteLinkTarget } from "@rewindom/builtin/marketing/shared/site-link-target.js";

export function eventsLinkTargets(input: {
  indexLabel: string;
  entityIndexLabel: string;
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
