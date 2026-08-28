import {
  resolveSortField,
  resolveSortOrder,
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { toThing, toThingListItem } from "./thing.mapper.js";
import {
  localDateKey,
  parseDateKey,
  validateThingInput,
} from "./thing.util.js";

import type {
  Thing,
  ThingArchiveBounds,
  ThingKind,
  ThingListItem,
} from "../shared/index.js";

export interface ListThingsParams {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}

export interface ListThingsResult {
  items: ThingListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

const THING_SORTABLE_FIELDS = new Set([
  "title",
  "text",
  "kind",
  "published_on",
  "enabled",
  "updated_at",
  "created_at",
]);

function buildThingOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Record<string, "asc" | "desc"> {
  const field = resolveSortField(sortBy, THING_SORTABLE_FIELDS, "published_on");
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order };
}

function buildThingListWhere(
  tenant_id: string,
  q?: string,
): ReturnType<typeof withTenantScope> {
  return withTenantScope(tenant_id, {
    ...(q?.trim()
      ? {
          OR: [
            { text: { contains: q.trim(), mode: "insensitive" as const } },
            { title: { contains: q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  });
}

export async function listThings(
  params: ListThingsParams,
): Promise<ListThingsResult> {
  const { tenant_id, page, page_size, q, sort_by, sort_dir } = params;
  const skip = (page - 1) * page_size;

  const [records, total] = await Promise.all([
    prisma.thing.findMany({
      where: buildThingListWhere(tenant_id, q),
      orderBy: buildThingOrderBy(sort_by, sort_dir),
      skip,
      take: page_size,
    }),
    prisma.thing.count({ where: buildThingListWhere(tenant_id, q) }),
  ]);

  return {
    items: records.map(toThingListItem),
    page,
    page_size,
    total,
    page_count: Math.ceil(total / page_size),
  };
}

export async function getThing(
  tenant_id: string,
  thing_id: string,
): Promise<Thing> {
  const record = await prisma.thing.findFirst({
    where: withTenantScope(tenant_id, { id: thing_id }),
  });
  if (!record) {
    throw new NotFoundError("useless.not_found");
  }
  return toThing(record);
}

export async function createThing(params: {
  tenant_id: string;
  user_id: string;
  kind?: ThingKind;
  title?: string;
  text?: string;
  html?: string;
  published_on?: string | null;
  enabled?: boolean;
}): Promise<Thing> {
  const validationError = validateThingInput(params);
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const record = await prisma.thing.create({
    data: {
      tenant_id: params.tenant_id,
      kind: params.kind ?? "text",
      title: params.title?.trim() ?? "",
      text: params.text?.trim() ?? "",
      // HTML 只 trim 两端空白，内容原样存——它要进沙箱 iframe 执行
      html: params.html?.trim() ?? "",
      published_on: params.published_on
        ? parseDateKey(params.published_on)
        : null,
      ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
      created_by: params.user_id,
    },
  });

  return toThing(record);
}

export async function updateThing(params: {
  tenant_id: string;
  user_id: string;
  thing_id: string;
  kind?: ThingKind;
  title?: string;
  text?: string;
  html?: string;
  published_on?: string | null;
  enabled?: boolean;
}): Promise<Thing> {
  const existing = await prisma.thing.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.thing_id }),
  });
  if (!existing) {
    throw new NotFoundError("useless.not_found");
  }

  /*
   * 部分更新要按**改完之后**的 kind 校验：只把 kind 从 text 改成 embed、
   * 不带 html 的那次，光看 payload 是「没给 html，跳过」，实际会存出一条
   * 空的可交互物。所以先合并再校验。
   */
  const merged = {
    kind: params.kind ?? (existing.kind as ThingKind),
    title: params.title ?? existing.title,
    text: params.text ?? existing.text,
    html: params.html ?? existing.html,
    published_on: params.published_on,
  };
  const validationError = validateThingInput(merged);
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  // 归属校验并进 where：上面的 findFirst 负责给出 404，
  // 这里再带一次租户谓词，使「校验」与「写入」落在同一条语句里。
  const record = await prisma.thing.update({
    where: withTenantScope(params.tenant_id, { id: params.thing_id }),
    data: {
      ...(params.kind !== undefined ? { kind: params.kind } : {}),
      ...(params.title !== undefined ? { title: params.title.trim() } : {}),
      ...(params.text !== undefined ? { text: params.text.trim() } : {}),
      ...(params.html !== undefined ? { html: params.html.trim() } : {}),
      ...(params.published_on !== undefined
        ? {
            published_on: params.published_on
              ? parseDateKey(params.published_on)
              : null,
          }
        : {}),
      ...(params.enabled !== undefined ? { enabled: params.enabled } : {}),
      updated_by: params.user_id,
    },
  });

  return toThing(record);
}

export async function deleteThing(
  tenant_id: string,
  thing_id: string,
): Promise<void> {
  const existing = await prisma.thing.findFirst({
    where: withTenantScope(tenant_id, { id: thing_id }),
  });
  if (!existing) {
    throw new NotFoundError("useless.not_found");
  }

  // 同 update：租户谓词并进 delete 自身，避免 check-then-act 的时间窗。
  await prisma.thing.delete({
    where: withTenantScope(tenant_id, { id: thing_id }),
  });
}

/**
 * 取某一天那条 —— 没有就**当场随机绑一个**，绑完落库。
 *
 * 为什么不是纯 `hash(日期) % 池子大小`：那样只要往池子里加一个东西，
 * 全部历史都会重新洗牌，昨天回头看到的会是另一个。绑定必须落库才稳。
 *
 * `bind: false` 用于只读场景（算相邻天、预览），不想让一次浏览产生写入。
 *
 * 并发下同一天可能有两个请求同时想绑，靠 `@@unique([tenant_id, published_on])`
 * 兜底：抢输的那个 upsert 失败，回头再读一次，拿到赢家绑的那条。
 */
export async function getThingOn(
  tenant_id: string,
  date_key: string,
  options: { bind?: boolean } = {},
): Promise<Thing | null> {
  const published_on = parseDateKey(date_key);
  if (!published_on) return null;

  const existing = await prisma.thing.findFirst({
    where: withTenantScope(tenant_id, { enabled: true, published_on }),
  });
  if (existing) return toThing(existing);

  if (options.bind === false) return null;

  const bound = await bindRandomThing(tenant_id, published_on);
  if (bound) return bound;

  // 抢输了：赢家已经绑上，再读一次
  const winner = await prisma.thing.findFirst({
    where: withTenantScope(tenant_id, { enabled: true, published_on }),
  });
  return winner ? toThing(winner) : null;
}

/**
 * 从还没绑过日期的池子里随机挑一个，绑到这一天。
 *
 * 池子空（东西都用完了）返回 null——那天就没有东西，这是正常状态。
 * 随机用 `ORDER BY random()`：池子是几百条量级，不值得为它引入别的机制。
 */
async function bindRandomThing(
  tenant_id: string,
  published_on: Date,
): Promise<Thing | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Thing"
    WHERE "tenant_id" = ${tenant_id}
      AND "enabled" = true
      AND "published_on" IS NULL
    ORDER BY random()
    LIMIT 1
  `;
  const candidate = rows[0];
  if (!candidate) return null;

  try {
    const record = await prisma.thing.update({
      // 再带一次 published_on IS NULL 之外的租户谓词，写入与校验同一条语句
      where: withTenantScope(tenant_id, { id: candidate.id }),
      data: { published_on },
    });
    return toThing(record);
  } catch {
    // 唯一约束撞了 = 这一天被别的请求抢先绑了
    return null;
  }
}

/** 今天那条。挂钟按 `DAILY_OFFSET_MINUTES` 切日。 */
export async function getTodayThing(
  tenant_id: string,
  options: { now?: Date } = {},
): Promise<Thing | null> {
  return getThingOn(tenant_id, localDateKey(options.now ?? new Date()));
}

/**
 * 归档的第一天与最后一天，给日期选择器的 min/max 用。
 *
 * 只算已启用且排了期的：草稿和停用的不该让选择器显得有东西。
 */
export async function getArchiveBounds(
  tenant_id: string,
): Promise<ThingArchiveBounds> {
  const where = withTenantScope(tenant_id, {
    enabled: true,
    published_on: { not: null },
  });
  const [first, last] = await Promise.all([
    prisma.thing.findFirst({
      where,
      orderBy: { published_on: "asc" },
      select: { published_on: true },
    }),
    prisma.thing.findFirst({
      where,
      orderBy: { published_on: "desc" },
      select: { published_on: true },
    }),
  ]);
  const key = (d: Date | null | undefined) =>
    d ? d.toISOString().slice(0, 10) : null;
  return { earliest: key(first?.published_on), latest: key(last?.published_on) };
}

/**
 * 相邻的、**真的有东西**的那一天。
 *
 * 不是简单的 ±1 天：中间空着的日子点过去会是空页，读者会以为坏了。
 */
export async function getAdjacentDates(
  tenant_id: string,
  date_key: string,
): Promise<{ prev: string | null; next: string | null }> {
  const published_on = parseDateKey(date_key);
  if (!published_on) return { prev: null, next: null };

  const base = { enabled: true };
  const [prev, next] = await Promise.all([
    prisma.thing.findFirst({
      where: withTenantScope(tenant_id, {
        ...base,
        published_on: { lt: published_on },
      }),
      orderBy: { published_on: "desc" },
      select: { published_on: true },
    }),
    prisma.thing.findFirst({
      where: withTenantScope(tenant_id, {
        ...base,
        published_on: { gt: published_on },
      }),
      orderBy: { published_on: "asc" },
      select: { published_on: true },
    }),
  ]);
  const key = (d: Date | null | undefined) =>
    d ? d.toISOString().slice(0, 10) : null;
  return { prev: key(prev?.published_on), next: key(next?.published_on) };
}
