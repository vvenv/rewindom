import {
  EVENT_FEED_NAME_MAX_LENGTH,
  EVENT_TOPICS,
  isEventConnector,
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
}

export const INITIAL_EVENT_FEED_FORM: EventFeedFormValues = {
  connector: "rss",
  name: "",
  url: "",
  source_kind: "news",
  topic: "tech",
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
} {
  return {
    connector: values.connector,
    name: values.name.trim(),
    url: values.connector === "rss" ? values.url.trim() : undefined,
    source_kind: values.source_kind,
    topic: values.topic,
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
