import {
  resolveSortField,
  resolveSortOrder,
  ConflictError,
  NotFoundError,
  ValidationError,
  prisma,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import { isReservedPageSlug } from "@rewindom/builtin/marketing/shared/reserved-slugs.js";

import { slugifyThing } from "../shared/slug.js";
import { toThing, toThingListItem } from "./thing.mapper.js";
import { validateThingInput } from "./thing.util.js";

import type {
  Thing,
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
  "slug",
  "text",
  "kind",
  "enabled",
  "updated_at",
  "created_at",
]);

function buildThingOrderBy(
  sortBy?: string,
  sortDir?: "asc" | "desc",
): Record<string, "asc" | "desc"> {
  const field = resolveSortField(sortBy, THING_SORTABLE_FIELDS, "created_at");
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
            { slug: { contains: q.trim(), mode: "insensitive" as const } },
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

/** 公开站目录：已启用的全部，不分页。量级是几十条。 */
export async function listPublishedThings(tenant_id: string): Promise<Thing[]> {
  const records = await prisma.thing.findMany({
    where: withTenantScope(tenant_id, { enabled: true }),
    orderBy: { created_at: "desc" },
  });
  return records.map(toThing);
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

export async function getPublishedThingBySlug(
  tenant_id: string,
  slug: string,
): Promise<Thing> {
  const record = await prisma.thing.findFirst({
    where: withTenantScope(tenant_id, { slug, enabled: true }),
  });
  if (!record) {
    throw new NotFoundError("useless.not_found");
  }
  return toThing(record);
}

async function allocateSlug(input: {
  tenant_id: string;
  requested?: string;
  fallback: string;
  except_id?: string;
}): Promise<string> {
  const requested = input.requested?.trim() ?? "";
  if (requested) {
    if (isReservedPageSlug(requested)) {
      throw new ValidationError("useless.slug_reserved");
    }
    const clash = await prisma.thing.findFirst({
      where: withTenantScope(input.tenant_id, {
        slug: requested,
        ...(input.except_id ? { id: { not: input.except_id } } : {}),
      }),
      select: { id: true },
    });
    if (clash) throw new ConflictError("useless.slug_taken");
    return requested;
  }

  const base = slugifyThing(input.fallback) || "thing";
  for (let n = 0; n < 50; n += 1) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    if (isReservedPageSlug(candidate)) continue;
    const clash = await prisma.thing.findFirst({
      where: withTenantScope(input.tenant_id, {
        slug: candidate,
        ...(input.except_id ? { id: { not: input.except_id } } : {}),
      }),
      select: { id: true },
    });
    if (!clash) return candidate;
  }
  throw new ConflictError("useless.slug_taken");
}

export async function createThing(params: {
  tenant_id: string;
  user_id: string;
  kind?: ThingKind;
  title?: string;
  slug?: string;
  text?: string;
  html?: string;
  thumbnail?: string;
  enabled?: boolean;
}): Promise<Thing> {
  const validationError = validateThingInput(params);
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const kind = params.kind ?? "text";
  const title = params.title?.trim() ?? "";
  const text = params.text?.trim() ?? "";
  const slug = await allocateSlug({
    tenant_id: params.tenant_id,
    requested: params.slug,
    fallback: title || text,
  });

  const record = await prisma.thing.create({
    data: {
      tenant_id: params.tenant_id,
      kind,
      title,
      slug,
      text,
      html: params.html?.trim() ?? "",
      thumbnail: params.thumbnail?.trim() ?? "",
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
  slug?: string;
  text?: string;
  html?: string;
  thumbnail?: string;
  enabled?: boolean;
}): Promise<Thing> {
  const existing = await prisma.thing.findFirst({
    where: withTenantScope(params.tenant_id, { id: params.thing_id }),
  });
  if (!existing) {
    throw new NotFoundError("useless.not_found");
  }

  const merged = {
    kind: params.kind ?? (existing.kind as ThingKind),
    title: params.title ?? existing.title,
    slug: params.slug,
    text: params.text ?? existing.text,
    html: params.html ?? existing.html,
    thumbnail: params.thumbnail ?? existing.thumbnail,
  };
  const validationError = validateThingInput(merged);
  if (validationError) {
    throw new ValidationError(validationError.code, validationError.params);
  }

  const title =
    params.title !== undefined ? params.title.trim() : existing.title;
  const text = params.text !== undefined ? params.text.trim() : existing.text;
  const slug =
    params.slug !== undefined
      ? await allocateSlug({
          tenant_id: params.tenant_id,
          requested: params.slug,
          fallback: title || text,
          except_id: params.thing_id,
        })
      : existing.slug;

  const record = await prisma.thing.update({
    where: withTenantScope(params.tenant_id, { id: params.thing_id }),
    data: {
      ...(params.kind !== undefined ? { kind: params.kind } : {}),
      ...(params.title !== undefined ? { title } : {}),
      slug,
      ...(params.text !== undefined ? { text } : {}),
      ...(params.html !== undefined ? { html: params.html.trim() } : {}),
      ...(params.thumbnail !== undefined
        ? { thumbnail: params.thumbnail.trim() }
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

  await prisma.thing.delete({
    where: withTenantScope(tenant_id, { id: thing_id }),
  });
}
