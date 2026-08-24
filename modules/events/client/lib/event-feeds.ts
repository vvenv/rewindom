import {
  EVENT_FEED_NAME_MAX_LENGTH,
  EVENT_TOPICS,
  isEventConnector,
  isFirstPartySource,
  isEventSourceKind,
  isEventTopic,
  type EventConnectorId,
  type EventFeedItem,
  type EventSourceKind,
  type EventTopic,
} from "../../shared/index.js";

export interface EventFeedFormValues {
  connector: EventConnectorId;
  name: string;
  url: string;
  source_kind: EventSourceKind;
  topic: EventTopic;
  /**
   * 出版方实体——「这条源发的事，是关于谁的」。只对一手来源有意义。
   * 空串 = 没标（服务端一并清掉类型）。
   */
  publisher_entity_name: string;
  publisher_entity_kind: string;
}

export const INITIAL_EVENT_FEED_FORM: EventFeedFormValues = {
  connector: "rss",
  name: "",
  url: "",
  source_kind: "news",
  topic: "tech",
  publisher_entity_name: "",
  // 分不出类型时的那一格，与规则抽取同口径——不替租户猜
  publisher_entity_kind: "org",
};

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function validateEventFeedForm(
  values: EventFeedFormValues,
  t: Translate,
): string | null {
  const name = values.name.trim();
  if (!name) {
    return t("sources.validation.nameRequired");
  }
  if (name.length > EVENT_FEED_NAME_MAX_LENGTH) {
    return t("sources.validation.nameTooLong", {
      max: EVENT_FEED_NAME_MAX_LENGTH,
    });
  }
  if (!isEventConnector(values.connector)) {
    return t("sources.validation.connectorInvalid");
  }
  if (values.connector === "rss") {
    const url = values.url.trim();
    if (!url) {
      return t("sources.validation.urlRequired");
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return t("sources.validation.urlInvalid");
      }
    } catch {
      return t("sources.validation.urlInvalid");
    }
  }
  if (!isEventSourceKind(values.source_kind)) {
    return t("sources.validation.sourceKindInvalid");
  }
  if (!isEventTopic(values.topic)) {
    return t("sources.validation.topicInvalid");
  }
  return null;
}

export function buildEventFeedPayload(values: EventFeedFormValues): {
  connector: EventConnectorId;
  name: string;
  url?: string;
  source_kind: EventSourceKind;
  topic: EventTopic;
  publisher_entity_name: string;
  publisher_entity_kind: string;
} {
  return {
    connector: values.connector,
    name: values.name.trim(),
    url: values.connector === "rss" ? values.url.trim() : undefined,
    source_kind: values.source_kind,
    topic: values.topic,
    /*
     * 非一手来源一律不带出版方（服务端也会再清一次——两处都守是刻意的：
     * 界面上那两个框在切到 news 时就该消失，而 API 不能指望界面）。
     */
    publisher_entity_name: isFirstPartySource(values.source_kind)
      ? values.publisher_entity_name.trim()
      : "",
    publisher_entity_kind: values.publisher_entity_kind,
  };
}

export interface EventFeedTopicGroup {
  topic: EventTopic;
  feeds: EventFeedItem[];
}

/** 七格都出现，没有源的格子也留着——主题开关要能拨。 */
export function groupFeedsByTopic(
  feeds: readonly EventFeedItem[],
): EventFeedTopicGroup[] {
  const buckets = new Map<EventTopic, EventFeedItem[]>(
    EVENT_TOPICS.map((topic) => [topic, []]),
  );
  for (const feed of feeds) {
    buckets.get(feed.topic)?.push(feed);
  }
  return EVENT_TOPICS.map((topic) => ({
    topic,
    feeds: buckets.get(topic) ?? [],
  }));
}
