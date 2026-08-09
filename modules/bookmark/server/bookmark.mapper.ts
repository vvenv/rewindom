import { prisma } from "@be-water/module-sdk/server";

import { buildDescriptionPreview } from "./bookmark.util.js";

import type { Bookmark, BookmarkListItem } from "../shared/index.js";

/** 从 prisma 实例推导记录类型——无需直接 import 生成的 Prisma client 类型。 */
type BookmarkRecord = NonNullable<
  Awaited<ReturnType<typeof prisma.bookmark.findFirst>>
>;

export function toBookmarkListItem(record: BookmarkRecord): BookmarkListItem {
  return {
    id: record.id,
    url: record.url,
    host: record.host,
    title: record.title,
    description_preview: buildDescriptionPreview(record.description),
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

export function toBookmark(record: BookmarkRecord): Bookmark {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    url: record.url,
    host: record.host,
    title: record.title,
    description: record.description,
    created_by: record.created_by,
    updated_by: record.updated_by,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}
