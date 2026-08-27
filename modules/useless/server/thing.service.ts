import {
  resolveSortField,
  resolveSortOrder,
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { toThing, toThingListItem } from "./thing.mapper.js";
import { validateThingInput } from "./thing.util.js";

import type { Thing, ThingListItem } from "../shared/index.js";

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
  "text",
  "enabled",
  "updated_at",
  "created_at",
]);

function buildThingOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
):
  | { text: "asc" | "desc" }
  | { enabled: "asc" | "desc" }
  | { updated_at: "asc" | "desc" }
  | { created_at: "asc" | "desc" } {
  const field = resolveSortField(sortBy, THING_SORTABLE_FIELDS, "updated_at");
  const order = resolveSortOrder(sortDir, "desc");
  return { [field]: order } as
    | { text: "asc" | "desc" }
    | { enabled: "asc" | "desc" }
    | { updated_at: "asc" | "desc" }
    | { created_at: "asc" | "desc" };
}

function buildThingListWhere(
  tenant_id: string,
  q?: string,
): ReturnType<typeof withTenantScope> {
  return withTenantScope(tenant_id, {
    ...(q?.trim()
      ? {
          OR: [{ text: { contains: q.trim(), mode: "insensitive" as const } }],
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
  text: string;
  enabled?: boolean;
}): Promise<Thing> {
  const validationError = validateThingInput({
    text: params.text,
    enabled: params.enabled,
  });
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const record = await prisma.thing.create({
    data: {
      tenant_id: params.tenant_id,
      text: params.text.trim(),
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
  text?: string;
  enabled?: boolean;
}): Promise<Thing> {
  const validationError = validateThingInput(
    {
      text: params.text,
      enabled: params.enabled,
    },
    { partial: true },
  );
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const existing = await prisma.thing.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.thing_id }),
  });
  if (!existing) {
    throw new NotFoundError("useless.not_found");
  }

  // 归属校验并进 where：上面的 findFirst 负责给出 404，
  // 这里再带一次租户谓词，使「校验」与「写入」落在同一条语句里。
  const record = await prisma.thing.update({
    where: withTenantScope(params.tenant_id, { id: params.thing_id }),
    data: {
      ...(params.text !== undefined ? { text: params.text.trim() } : {}),
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
