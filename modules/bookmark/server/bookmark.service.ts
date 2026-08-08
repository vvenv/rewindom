import {
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
  resolveSortField,
  resolveSortOrder,
} from "@be-water/module-sdk/server";

import { toBookmark, toBookmarkListItem } from "./bookmark.mapper.js";
import { validateBookmarkInput } from "./bookmark.util.js";

import type {
  Bookmark,
  BookmarkListItem,
} from "../shared/index.js";

export interface ListBookmarksParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListBookmarksResult {
  items: BookmarkListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

const BOOKMARK_SORTABLE_FIELDS = new Set(["title", "updated_at", "created_at"]);

function buildOrderBy(sortBy?: string, sortDir?: "asc" | "desc") {
  const field = resolveSortField(
    sortBy,
    BOOKMARK_SORTABLE_FIELDS,
    "updated_at",
  );
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as
    | { title: "asc" | "desc" }
    | { updated_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" };
}

function buildListWhere(tenant_id: string, q?: string) {
  return withTenantScope(tenant_id, {
    ...(q?.trim()
      ? {
          OR: [
            { title: { contains: q.trim(), mode: "insensitive" as const } },
            { url: { contains: q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
}

export async function listBookmarks(
  params: ListBookmarksParams,
): Promise<ListBookmarksResult> {
  const { tenant_id, page, page_size, q, sort_by, sort_dir } = params;
  const skip = (page - 1) * page_size;

  const [records, total] = await Promise.all([
    prisma.bookmark.findMany({
      where: buildListWhere(tenant_id, q),
      orderBy: buildOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.bookmark.count({ where: buildListWhere(tenant_id, q) }),
  ]);

  return {
    items: records.map(toBookmarkListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

export async function getBookmark(
  tenant_id: string,
  bookmark_id: string,
): Promise<Bookmark> {
  const record = await prisma.bookmark.findFirst({
    where: withTenantScope(tenant_id, { id: bookmark_id }),
  });
  if (!record) {
    throw new NotFoundError("bookmark.not_found");
  }
  return toBookmark(record);
}

export async function createBookmark(params: {
  tenant_id: string;
  user_id: string;
  url: string;
  title: string;
  description?: string;
}): Promise<Bookmark> {
  const validationError = validateBookmarkInput({
    url: params.url,
    title: params.title,
    description: params.description,
  });
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const record = await prisma.bookmark.create({
    data: {
      tenant_id: params.tenant_id,
      url: params.url.trim(),
      title: params.title.trim(),
      description: params.description?.trim() ?? "",
      created_by: params.user_id,
    },
  });

  return toBookmark(record);
}

export async function updateBookmark(params: {
  tenant_id: string;
  user_id: string;
  bookmark_id: string;
  url?: string;
  title?: string;
  description?: string;
}): Promise<Bookmark> {
  const validationError = validateBookmarkInput(
    { url: params.url, title: params.title, description: params.description },
    { requireTitle: params.title !== undefined },
  );
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const existing = await prisma.bookmark.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.bookmark_id }),
  });
  if (!existing) {
    throw new NotFoundError("bookmark.not_found");
  }

  const record = await prisma.bookmark.update({
    where: withTenantScope(params.tenant_id, { id: params.bookmark_id }),
    data: {
      ...(params.url !== undefined ? { url: params.url.trim() } : {}),
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.description !== undefined
        ? { description: params.description.trim() }
        : {}),
    },
  });

  return toBookmark(record);
}

export async function deleteBookmark(
  tenant_id: string,
  bookmark_id: string,
): Promise<void> {
  const existing = await prisma.bookmark.findFirst({
    where: withTenantScope(tenant_id, { id: bookmark_id }),
  });
  if (!existing) {
    throw new NotFoundError("bookmark.not_found");
  }

  await prisma.bookmark.delete({
    where: withTenantScope(tenant_id, { id: bookmark_id }),
  });
}
