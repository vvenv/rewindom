import { isEntityKind } from "../event/entity-extractor.js";

import {
  EVENT_FEED_NAME_MAX_LENGTH,
  isEventConnector,
  isFirstPartySource,
  isEventSourceKind,
  isEventTopic,
  type EventConnectorId,
  type EventFeedWriteBody,
  type EventSourceKind,
  type EventTopic,
} from "../../shared/index.js";

import { HACKER_NEWS_API_ROOT } from "../ingest/feed-catalog.js";

export interface NormalizedFeedInput {
  connector: EventConnectorId;
  name: string;
  url: string;
  source_kind: EventSourceKind;
  topic: EventTopic;
  enabled: boolean;
  /** 出版方实体。非一手来源恒为 null（见 normalizePublisherEntity） */
  publisher_entity_name: string | null;
  publisher_entity_kind: string | null;
}

export type FeedValidationCode =
  | "events.feed_name_required"
  | "events.feed_name_too_long"
  | "events.feed_url_required"
  | "events.feed_url_invalid"
  | "events.feed_connector_invalid"
  | "events.feed_source_kind_invalid"
  | "events.feed_topic_invalid"
  | "events.feed_publisher_kind_invalid";

export class FeedValidationError extends Error {
  constructor(
    readonly code: FeedValidationCode,
    readonly params?: Record<string, number>,
  ) {
    super(code);
    this.name = "FeedValidationError";
  }
}

export function normalizeFeedCreate(
  body: EventFeedWriteBody,
): NormalizedFeedInput {
  const connector = body.connector ?? "rss";
  if (!isEventConnector(connector)) {
    throw new FeedValidationError("events.feed_connector_invalid");
  }
  return {
    connector,
    name: requireName(body.name),
    url: resolveFeedUrl(connector, body.url),
    source_kind: requireSourceKind(body.source_kind),
    topic: requireTopic(body.topic),
    enabled: body.enabled !== false,
    ...normalizePublisherEntity(body, requireSourceKind(body.source_kind)),
  };
}

export function normalizeFeedUpdate(
  body: EventFeedWriteBody,
  current: {
    connector: string;
    url: string;
    source_kind: string;
    publisher_entity_name: string | null;
    publisher_entity_kind: string | null;
  },
): Partial<NormalizedFeedInput> {
  const patch: Partial<NormalizedFeedInput> = {};
  if (body.name !== undefined) {
    patch.name = requireName(body.name);
  }
  if (body.source_kind !== undefined) {
    patch.source_kind = requireSourceKind(body.source_kind);
  }
  if (body.topic !== undefined) {
    patch.topic = requireTopic(body.topic);
  }
  if (body.enabled !== undefined) {
    patch.enabled = body.enabled;
  }
  if (body.url !== undefined) {
    const connector = isEventConnector(current.connector)
      ? current.connector
      : "rss";
    patch.url = resolveFeedUrl(connector, body.url);
  }
  /*
   * 出版方跟着 source_kind 走：源从 official 改成 news 时标注必须一起清掉，
   * 否则「TechCrunch 的报道是关于 TechCrunch 的」会从库里的残留悄悄回来。
   * 所以只要这两者任一被改动，就整体重算。
   */
  if (
    body.publisher_entity_name !== undefined ||
    body.publisher_entity_kind !== undefined ||
    body.source_kind !== undefined
  ) {
    const sourceKind =
      patch.source_kind ?? requireSourceKind(current.source_kind);
    Object.assign(
      patch,
      normalizePublisherEntity(
        {
          publisher_entity_name:
            body.publisher_entity_name ?? current.publisher_entity_name ?? "",
          publisher_entity_kind:
            body.publisher_entity_kind ?? current.publisher_entity_kind ?? "",
        },
        sourceKind,
      ),
    );
  }
  return patch;
}

/**
 * 出版方实体的归一。
 *
 * **非一手来源一律清空**：一篇 TechCrunch 报道不是「关于 TechCrunch」的，
 * 给 news / community 源标出版方会把每个媒体变成一个实体聚合面。
 * 这条在写入口守住，比在读路径上到处判 `isFirstPartySource` 可靠。
 *
 * 名字为空 = 没标；此时类型也一并清掉，不留一个没有主语的类型。
 */
function normalizePublisherEntity(
  body: Pick<
    EventFeedWriteBody,
    "publisher_entity_name" | "publisher_entity_kind"
  >,
  sourceKind: EventSourceKind,
): {
  publisher_entity_name: string | null;
  publisher_entity_kind: string | null;
} {
  const name = body.publisher_entity_name?.trim() ?? "";
  if (!isFirstPartySource(sourceKind) || !name) {
    return { publisher_entity_name: null, publisher_entity_kind: null };
  }
  if (name.length > EVENT_FEED_NAME_MAX_LENGTH) {
    throw new FeedValidationError("events.feed_name_too_long", {
      max: EVENT_FEED_NAME_MAX_LENGTH,
    });
  }
  const kind = body.publisher_entity_kind?.trim() ?? "";
  if (kind && !isEntityKind(kind)) {
    throw new FeedValidationError("events.feed_publisher_kind_invalid");
  }
  // 没选类型时按规则抽取分不出类型的那一格记，不猜
  return { publisher_entity_name: name, publisher_entity_kind: kind || "org" };
}

function requireName(value: string | undefined): string {
  const name = value?.trim() ?? "";
  if (!name) {
    throw new FeedValidationError("events.feed_name_required");
  }
  if (name.length > EVENT_FEED_NAME_MAX_LENGTH) {
    throw new FeedValidationError("events.feed_name_too_long", {
      max: EVENT_FEED_NAME_MAX_LENGTH,
    });
  }
  return name;
}

function requireSourceKind(value: string | undefined): EventSourceKind {
  if (!isEventSourceKind(value)) {
    throw new FeedValidationError("events.feed_source_kind_invalid");
  }
  return value;
}

function requireTopic(value: string | undefined): EventTopic {
  if (!isEventTopic(value)) {
    throw new FeedValidationError("events.feed_topic_invalid");
  }
  return value;
}

function resolveFeedUrl(
  connector: EventConnectorId,
  url: string | undefined,
): string {
  if (connector === "hackernews") {
    return HACKER_NEWS_API_ROOT;
  }
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    throw new FeedValidationError("events.feed_url_required");
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new FeedValidationError("events.feed_url_invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new FeedValidationError("events.feed_url_invalid");
  }
  return parsed.toString();
}
