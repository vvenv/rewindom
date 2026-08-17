import {
  ConflictError,
  NotFoundError,
  Prisma,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { ensureDefaultFeeds } from "../ingest/feed-seed.js";

import {
  FeedValidationError,
  normalizeFeedCreate,
  normalizeFeedUpdate,
} from "./feed.util.js";

import type {
  EventConnectorId,
  EventFeedItem,
  EventFeedListResult,
  EventFeedWriteBody,
  EventSourceKind,
  EventTopic,
} from "../../shared/index.js";

export async function listEventFeeds(
  tenantId: string,
): Promise<EventFeedListResult> {
  await ensureDefaultFeeds(tenantId);
  const rows = await prisma.eventFeed.findMany({
    where: withTenantScope(tenantId),
    orderBy: [{ created_at: "asc" }],
  });
  return { items: rows.map(toFeedItem) };
}

export async function createEventFeed(
  tenantId: string,
  body: EventFeedWriteBody,
): Promise<EventFeedItem> {
  const input = wrapValidation(() => normalizeFeedCreate(body));
  try {
    const row = await prisma.eventFeed.create({
      data: { tenant_id: tenantId, ...input },
    });
    return toFeedItem(row);
  } catch (err) {
    throwIfUrlTaken(err);
    throw err;
  }
}

export async function updateEventFeed(params: {
  tenant_id: string;
  feed_id: string;
  body: EventFeedWriteBody;
}): Promise<EventFeedItem> {
  const current = await requireFeed(params.tenant_id, params.feed_id);
  const patch = wrapValidation(() =>
    normalizeFeedUpdate(params.body, current),
  );
  if (Object.keys(patch).length === 0) {
    return toFeedItem(current);
  }
  try {
    const row = await prisma.eventFeed.update({
      where: { id: current.id },
      data: patch,
    });
    return toFeedItem(row);
  } catch (err) {
    throwIfUrlTaken(err);
    throw err;
  }
}

export async function deleteEventFeed(
  tenantId: string,
  feedId: string,
): Promise<void> {
  const current = await requireFeed(tenantId, feedId);
  await prisma.eventFeed.delete({ where: { id: current.id } });
}

async function requireFeed(tenantId: string, feedId: string) {
  const row = await prisma.eventFeed.findFirst({
    where: withTenantScope(tenantId, { id: feedId }),
  });
  if (!row) {
    throw new NotFoundError("events.feed_not_found");
  }
  return row;
}

function wrapValidation<T>(run: () => T): T {
  try {
    return run();
  } catch (err) {
    if (err instanceof FeedValidationError) {
      throw new ValidationError(err.code, err.params);
    }
    throw err;
  }
}

function throwIfUrlTaken(err: unknown): void {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new ConflictError("events.feed_url_taken");
  }
}

function toFeedItem(row: {
  id: string;
  connector: string;
  name: string;
  url: string;
  source_kind: string;
  topic: string;
  enabled: boolean;
  last_fetched_at: Date | null;
  last_error: string | null;
}): EventFeedItem {
  return {
    id: row.id,
    connector: row.connector as EventConnectorId,
    name: row.name,
    url: row.url,
    source_kind: row.source_kind as EventSourceKind,
    topic: row.topic as EventTopic,
    enabled: row.enabled,
    last_fetched_at: row.last_fetched_at?.toISOString() ?? null,
    last_error: row.last_error,
  };
}
