import {
  ConflictError,
  NotFoundError,
  ValidationError,
  prisma,
  resolveSortField,
  resolveSortOrder,
  withTenantScope,
} from "@rewindom/module-sdk/server";
import type { AppLocale } from "@rewindom/module-sdk";

import {
  isShopCollectionStatus,
  isShopImageUrl,
  type CreateShopCollectionBody,
  type ShopCollection,
  type ShopCollectionListItem,
  type ShopCollectionStatus,
  type UpdateShopCollectionBody,
} from "../../shared/index.js";
import {
  displayTitle,
  parseLocalizedInput,
  requireLocalizedInput,
  SLUG_RE,
} from "../lib/format.js";

const COLLECTION_SORTABLE = new Set(["slug", "status", "updated_at", "created_at"]);

function toLocalizedMap(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const map = value as Record<string, string>;
  return Object.keys(map).length > 0 ? map : null;
}

function toCollection(
  record: {
    id: string;
    tenant_id: string;
    slug: string;
    status: string;
    title: unknown;
    description: unknown;
    seo_title: unknown;
    seo_description: unknown;
    image_url: string | null;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
    products?: Array<{ product_id: string; position: number }>;
  },
): ShopCollection {
  const products = [...(record.products ?? [])].sort(
    (a, b) => a.position - b.position,
  );
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    slug: record.slug,
    status: isShopCollectionStatus(record.status) ? record.status : "draft",
    title: toLocalizedMap(record.title) ?? {},
    description: toLocalizedMap(record.description),
    seo_title: toLocalizedMap(record.seo_title),
    seo_description: toLocalizedMap(record.seo_description),
    image_url: record.image_url,
    published_at: record.published_at?.toISOString() ?? null,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
    product_ids: products.map((row) => row.product_id),
  };
}

function validateSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!SLUG_RE.test(normalized)) {
    throw new ValidationError("shop.slug_invalid");
  }
  return normalized;
}

function parseImageUrl(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") throw new ValidationError("shop.images_invalid");
  const url = raw.trim();
  if (!url) return null;
  if (!isShopImageUrl(url)) throw new ValidationError("shop.images_invalid");
  return url;
}

async function replaceCollectionProducts(params: {
  tenant_id: string;
  collection_id: string;
  product_ids: string[];
}): Promise<void> {
  const unique: string[] = [];
  for (const id of params.product_ids) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (!unique.includes(id)) unique.push(id);
  }
  if (unique.length > 0) {
    const found = await prisma.shopProduct.findMany({
      where: withTenantScope(params.tenant_id, { id: { in: unique } }),
      select: { id: true },
    });
    if (found.length !== unique.length) {
      throw new ValidationError("shop.product_not_found");
    }
  }
  await prisma.$transaction(async (tx) => {
    await tx.shopCollectionProduct.deleteMany({
      where: withTenantScope(params.tenant_id, {
        collection_id: params.collection_id,
      }),
    });
    if (unique.length === 0) return;
    await tx.shopCollectionProduct.createMany({
      data: unique.map((product_id, position) => ({
        tenant_id: params.tenant_id,
        collection_id: params.collection_id,
        product_id,
        position,
      })),
    });
  });
}

export async function listCollections(params: {
  tenant_id: string;
  page: number;
  page_size: number;
  q?: string;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  locale: AppLocale;
}): Promise<{
  items: ShopCollectionListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}> {
  const skip = (params.page - 1) * params.page_size;
  const field = resolveSortField(params.sort_by, COLLECTION_SORTABLE, "updated_at");
  const order = resolveSortOrder(params.sort_dir, "desc");
  const where = withTenantScope(params.tenant_id, {
    ...(params.q?.trim()
      ? { slug: { contains: params.q.trim(), mode: "insensitive" as const } }
      : {}),
  });
  const [records, total] = await Promise.all([
    prisma.shopCollection.findMany({
      where,
      orderBy: { [field]: order },
      skip,
      take: params.page_size,
      include: { _count: { select: { products: true } } },
    }),
    prisma.shopCollection.count({ where }),
  ]);
  return {
    items: records.map((record) => ({
      id: record.id,
      slug: record.slug,
      status: isShopCollectionStatus(record.status) ? record.status : "draft",
      title: displayTitle(record.title, params.locale, record.slug),
      product_count: record._count.products,
      updated_at: record.updated_at.toISOString(),
    })),
    page: params.page,
    page_size: params.page_size,
    total,
    page_count: Math.ceil(total / params.page_size),
  };
}

export async function getCollection(
  tenant_id: string,
  collection_id: string,
): Promise<ShopCollection> {
  const record = await prisma.shopCollection.findFirst({
    where: withTenantScope(tenant_id, { id: collection_id }),
    include: { products: { orderBy: { position: "asc" } } },
  });
  if (!record) throw new NotFoundError("shop.collection_not_found");
  return toCollection(record);
}

export async function getPublishedCollectionBySlug(
  tenant_id: string,
  slug: string,
): Promise<ShopCollection> {
  const record = await prisma.shopCollection.findFirst({
    where: withTenantScope(tenant_id, { slug, status: "published" }),
    include: { products: { orderBy: { position: "asc" } } },
  });
  if (!record) throw new NotFoundError("shop.collection_not_found");
  return toCollection(record);
}

export async function createCollection(params: {
  tenant_id: string;
  locale: AppLocale;
  body: CreateShopCollectionBody;
}): Promise<ShopCollection> {
  const slug = validateSlug(params.body.slug);
  const title = requireLocalizedInput(params.body.title, params.locale);
  if (!Object.values(title).some((text) => text.trim())) {
    throw new ValidationError("shop.title_required");
  }
  const status: ShopCollectionStatus = isShopCollectionStatus(params.body.status)
    ? params.body.status
    : "draft";
  const clash = await prisma.shopCollection.findFirst({
    where: withTenantScope(params.tenant_id, { slug }),
    select: { id: true },
  });
  if (clash) throw new ConflictError("shop.slug_taken");

  const record = await prisma.shopCollection.create({
    data: {
      tenant_id: params.tenant_id,
      slug,
      status,
      title,
      description:
        parseLocalizedInput(params.body.description ?? null, params.locale) ??
        undefined,
      seo_title:
        parseLocalizedInput(params.body.seo_title ?? null, params.locale) ??
        undefined,
      seo_description:
        parseLocalizedInput(params.body.seo_description ?? null, params.locale) ??
        undefined,
      image_url: parseImageUrl(params.body.image_url),
      published_at: status === "published" ? new Date() : null,
    },
  });
  await replaceCollectionProducts({
    tenant_id: params.tenant_id,
    collection_id: record.id,
    product_ids: params.body.product_ids ?? [],
  });
  return getCollection(params.tenant_id, record.id);
}

export async function updateCollection(params: {
  tenant_id: string;
  collection_id: string;
  locale: AppLocale;
  body: UpdateShopCollectionBody;
}): Promise<ShopCollection> {
  const current = await getCollection(params.tenant_id, params.collection_id);
  const data: {
    slug?: string;
    status?: string;
    title?: Record<string, string>;
    description?: Record<string, string>;
    seo_title?: Record<string, string>;
    seo_description?: Record<string, string>;
    image_url?: string | null;
    published_at?: Date | null;
  } = {};

  if (params.body.slug !== undefined) {
    const slug = validateSlug(params.body.slug);
    const clash = await prisma.shopCollection.findFirst({
      where: withTenantScope(params.tenant_id, {
        slug,
        NOT: { id: params.collection_id },
      }),
      select: { id: true },
    });
    if (clash) throw new ConflictError("shop.slug_taken");
    data.slug = slug;
  }
  if (params.body.status !== undefined) {
    if (!isShopCollectionStatus(params.body.status)) {
      throw new ValidationError("shop.status_invalid");
    }
    data.status = params.body.status;
    if (params.body.status === "published" && !current.published_at) {
      data.published_at = new Date();
    }
  }
  if (params.body.title !== undefined) {
    const title = requireLocalizedInput(params.body.title, params.locale);
    if (!Object.values(title).some((text) => text.trim())) {
      throw new ValidationError("shop.title_required");
    }
    data.title = title;
  }
  if (params.body.description !== undefined) {
    data.description =
      parseLocalizedInput(params.body.description, params.locale) ?? {};
  }
  if (params.body.seo_title !== undefined) {
    data.seo_title =
      parseLocalizedInput(params.body.seo_title, params.locale) ?? {};
  }
  if (params.body.seo_description !== undefined) {
    data.seo_description =
      parseLocalizedInput(params.body.seo_description, params.locale) ?? {};
  }
  if (params.body.image_url !== undefined) {
    data.image_url = parseImageUrl(params.body.image_url);
  }

  await prisma.shopCollection.update({
    where: withTenantScope(params.tenant_id, { id: params.collection_id }),
    data,
  });
  if (params.body.product_ids !== undefined) {
    await replaceCollectionProducts({
      tenant_id: params.tenant_id,
      collection_id: params.collection_id,
      product_ids: params.body.product_ids,
    });
  }
  return getCollection(params.tenant_id, params.collection_id);
}

export async function deleteCollection(
  tenant_id: string,
  collection_id: string,
): Promise<void> {
  const existing = await prisma.shopCollection.findFirst({
    where: withTenantScope(tenant_id, { id: collection_id }),
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("shop.collection_not_found");
  await prisma.shopCollection.delete({
    where: withTenantScope(tenant_id, { id: collection_id }),
  });
}
