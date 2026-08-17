import {
  EVENT_FEED_NAME_MAX_LENGTH,
  isEventConnector,
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
}

export type FeedValidationCode =
  | "events.feed_name_required"
  | "events.feed_name_too_long"
  | "events.feed_url_required"
  | "events.feed_url_invalid"
  | "events.feed_connector_invalid"
  | "events.feed_source_kind_invalid"
  | "events.feed_topic_invalid";

export class FeedValidationError extends Error {
  constructor(
    readonly code: FeedValidationCode,
    readonly params?: Record<string, number>,
  ) {
    super(code);
    this.name = "FeedValidationError";
  }
}

export function normalizeFeedCreate(body: EventFeedWriteBody): NormalizedFeedInput {
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
  };
}

export function normalizeFeedUpdate(
  body: EventFeedWriteBody,
  current: { connector: string; url: string },
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
  return patch;
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

function resolveFeedUrl(connector: EventConnectorId, url: string | undefined): string {
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
