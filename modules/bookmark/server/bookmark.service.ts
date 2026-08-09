import {
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
  resolveSortField,
  resolveSortOrder,
} from "@be-water/module-sdk/server";

import { toBookmark, toBookmarkListItem } from "./bookmark.mapper.js";
import {
  extractBookmarkHost,
  normalizeBookmarkUrl,
  validateBookmarkInput,
} from "./bookmark.util.js";

import type {
  Bookmark,
  BookmarkHostFacet,
  BookmarkListItem,
} from "../shared/index.js";

export interface ListBookmarksParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  host?: string;
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

const BOOKMARK_SORTABLE_FIELDS = new Set([
  "title",
  "host",
  "updated_at",
  "created_at",
]);

/** 站点筛选的下拉最多给这么多项，再多就该靠搜索了。 */
const BOOKMARK_HOST_FACET_LIMIT = 30;

function buildOrderBy(sortBy?: string, sortDir?: "asc" | "desc") {
  const field = resolveSortField(
    sortBy,
    BOOKMARK_SORTABLE_FIELDS,
    "updated_at",
  );
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as
    | { title: "asc" | "desc" }
    | { host: "asc" | "desc" }
    | { updated_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" };
}

function buildListWhere(tenant_id: string, q?: string, host?: string) {
  const keyword = q?.trim();
  const site = host?.trim();
  return withTenantScope(tenant_id, {
    ...(site ? { host: site } : {}),
    ...(keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: "insensitive" as const } },
            { url: { contains: keyword, mode: "insensitive" as const } },
            {
              description: { contains: keyword, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  });
}

export async function listBookmarks(
  params: ListBookmarksParams,
): Promise<ListBookmarksResult> {
  const { tenant_id, page, page_size, q, host, sort_by, sort_dir } = params;
  const skip = (page - 1) * page_size;
  const where = buildListWhere(tenant_id, q, host);

  const [records, total] = await Promise.all([
    prisma.bookmark.findMany({
      where,
      orderBy: buildOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.bookmark.count({ where }),
  ]);

  return {
    items: records.map(toBookmarkListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

/** 筛选栏的站点分组。按条数降序，只取前 N 个站点。 */
export async function listBookmarkHosts(
  tenant_id: string,
): Promise<BookmarkHostFacet[]> {
  const groups = await prisma.bookmark.groupBy({
    by: ["host"],
    where: withTenantScope(tenant_id, { host: { not: "" } }),
    _count: { _all: true },
    orderBy: { _count: { host: "desc" } },
    take: BOOKMARK_HOST_FACET_LIMIT,
  });

  return groups.map((group) => ({
    host: group.host,
    count: group._count._all,
  }));
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
  title?: string;
  description?: string;
}): Promise<Bookmark> {
  const title = params.title?.trim() || undefined;
  const validationError = validateBookmarkInput(
    { url: params.url, title, description: params.description },
    { requireTitle: false },
  );
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  // 校验已经保证了这里必定能规范化。
  const url = normalizeBookmarkUrl(params.url)!;
  const host = extractBookmarkHost(url);

  const record = await prisma.bookmark.create({
    data: {
      tenant_id: params.tenant_id,
      url,
      host,
      // 标题留空就拿主机名兜底：粘一个链接即可存下，事后再改。
      title: title ?? host,
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
    { requireUrl: false, requireTitle: false },
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

  const url =
    params.url !== undefined ? normalizeBookmarkUrl(params.url)! : undefined;

  // 归属校验并进 where：上面的 findFirst 负责给出 404，
  // 这里再带一次租户谓词，使「校验」与「写入」落在同一条语句里。
  const record = await prisma.bookmark.update({
    where: withTenantScope(params.tenant_id, { id: params.bookmark_id }),
    data: {
      ...(url !== undefined ? { url, host: extractBookmarkHost(url) } : {}),
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.description !== undefined
        ? { description: params.description.trim() }
        : {}),
      updated_by: params.user_id,
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

  // 同 updateBookmark：租户谓词并进 delete 自身，避免 check-then-act 的时间窗。
  await prisma.bookmark.delete({
    where: withTenantScope(tenant_id, { id: bookmark_id }),
  });
}
