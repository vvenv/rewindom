/**
 * 文档库分类的读写。
 */

import {
  type SiteDocCategory as SiteDocCategoryRecord,
  type Prisma,
} from "@rewindom/server-kernel/generated/prisma/client/client.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@rewindom/server-kernel/lib/app-errors.js";
import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { withTenantScope } from "@rewindom/server-kernel/lib/tenant-scope.js";
import { normalizeLocale, type AppLocale } from "@rewindom/shared";

import {
  defaultCategoryLabel,
  parseCreateCategoryBody,
  parseUpdateCategoryBody,
  resolveCategoryLabel,
  validateCategoryKey,
  type CreateSiteDocCategoryBody,
  type SiteDocCategory,
  type ReorderSiteDocCategoriesBody,
  type UpdateSiteDocCategoryBody,
} from "../shared/site-doc-category.js";
import {
  isLocalizedText,
  type LocalizedText,
} from "../../marketing/shared/section-settings.js";

function asLabel(value: Prisma.JsonValue): string | LocalizedText {
  if (typeof value === "string") return value;
  if (isLocalizedText(value)) return value;
  return "";
}

function toCategory(record: SiteDocCategoryRecord): SiteDocCategory {
  return {
    id: record.id,
    tenant_id: record.tenant_id,
    key: record.key,
    label: asLabel(record.label),
    sort_order: record.sort_order,
    created_at: record.created_at.toISOString(),
    updated_at: record.updated_at.toISOString(),
  };
}

async function resolveDefaultLocale(tenant_id: string): Promise<AppLocale> {
  const site = await prisma.marketingSite.findFirst({
    where: withTenantScope(tenant_id),
    select: { default_locale: true },
  });
  return normalizeLocale(site?.default_locale);
}

async function nextCategorySortOrder(tenant_id: string): Promise<number> {
  const row = await prisma.siteDocCategory.aggregate({
    where: { tenant_id },
    _max: { sort_order: true },
  });
  return (row._max.sort_order ?? -10) + 10;
}

export async function reorderDocCategories(
  tenant_id: string,
  body: ReorderSiteDocCategoriesBody,
): Promise<SiteDocCategory[]> {
  const items = body?.items;
  if (!Array.isArray(items)) {
    throw new ValidationError("site.doc_category_order_invalid");
  }
  const seen = new Set<string>();
  for (const item of items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      !item.id ||
      !Number.isSafeInteger(item.sort_order) ||
      seen.has(item.id)
    ) {
      throw new ValidationError("site.doc_category_order_invalid");
    }
    seen.add(item.id);
  }

  if (seen.size > 0) {
    const owned = await prisma.siteDocCategory.count({
      where: withTenantScope(tenant_id, { id: { in: [...seen] } }),
    });
    if (owned !== seen.size) {
      throw new NotFoundError("site.doc_category_not_found");
    }
    await prisma.$transaction(
      items.map((item) =>
        prisma.siteDocCategory.update({
          where: { id: item.id, tenant_id },
          data: { sort_order: item.sort_order },
        }),
      ),
    );
  }

  return listDocCategories(tenant_id);
}

export async function listDocCategories(
  tenant_id: string,
): Promise<SiteDocCategory[]> {
  const records = await prisma.siteDocCategory.findMany({
    where: withTenantScope(tenant_id),
    orderBy: [{ sort_order: "asc" }, { key: "asc" }],
  });
  return records.map(toCategory);
}

export async function getDocCategory(
  tenant_id: string,
  category_id: string,
): Promise<SiteDocCategory> {
  const record = await prisma.siteDocCategory.findFirst({
    where: withTenantScope(tenant_id, { id: category_id }),
  });
  if (!record) throw new NotFoundError("site.doc_category_not_found");
  return toCategory(record);
}

export async function createDocCategory(
  tenant_id: string,
  body: CreateSiteDocCategoryBody,
): Promise<SiteDocCategory> {
  const parsed = parseCreateCategoryBody(body);
  const sort_order =
    body &&
    typeof body === "object" &&
    "sort_order" in body &&
    typeof body.sort_order === "number"
      ? parsed.sort_order
      : await nextCategorySortOrder(tenant_id);
  try {
    const created = await prisma.siteDocCategory.create({
      data: {
        tenant_id,
        key: parsed.key,
        label: parsed.label as Prisma.InputJsonValue,
        sort_order,
      },
    });
    return toCategory(created);
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      throw new ConflictError("site.doc_category_key_conflict");
    }
    throw err;
  }
}

export async function updateDocCategory(
  tenant_id: string,
  category_id: string,
  body: UpdateSiteDocCategoryBody,
): Promise<SiteDocCategory> {
  const parsed = parseUpdateCategoryBody(body);
  const existing = await prisma.siteDocCategory.findFirst({
    where: withTenantScope(tenant_id, { id: category_id }),
  });
  if (!existing) throw new NotFoundError("site.doc_category_not_found");
  const updated = await prisma.siteDocCategory.update({
    where: { id: category_id, tenant_id },
    data: {
      ...(parsed.label !== undefined
        ? { label: parsed.label as Prisma.InputJsonValue }
        : {}),
      ...(parsed.sort_order !== undefined
        ? { sort_order: parsed.sort_order }
        : {}),
    },
  });
  return toCategory(updated);
}

export async function deleteDocCategory(
  tenant_id: string,
  category_id: string,
): Promise<void> {
  const existing = await prisma.siteDocCategory.findFirst({
    where: withTenantScope(tenant_id, { id: category_id }),
  });
  if (!existing) throw new NotFoundError("site.doc_category_not_found");
  const inUse = await prisma.siteDoc.findFirst({
    where: withTenantScope(tenant_id, {
      OR: [
        { category: existing.key },
        { category_draft: existing.key },
      ],
    }),
    select: { id: true },
  });
  if (inUse) throw new ValidationError("site.doc_category_in_use");
  await prisma.siteDocCategory.delete({
    where: { id: category_id, tenant_id },
  });
}

/**
 * 解析文档上的分类字段：必须是已存在的分类 key，空串表示未分类。
 */
export async function resolveDocCategoryKey(
  tenant_id: string,
  raw: string,
): Promise<string> {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = validateCategoryKey(trimmed);
  const found = await prisma.siteDocCategory.findFirst({
    where: withTenantScope(tenant_id, { key }),
    select: { key: true },
  });
  if (!found) throw new ValidationError("site.doc_category_not_found");
  return key;
}

/** 种子默认产品站文档库时一次性写入 canonical 分类。 */
export async function seedDefaultDocCategories(
  tenant_id: string,
): Promise<void> {
  const keys = [
    "getting-started",
    "core-concepts",
    "build-operate",
    "platform-admin",
  ];
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    const label = defaultCategoryLabel(key);
    if (!label) continue;
    await prisma.siteDocCategory.upsert({
      where: { tenant_id_key: { tenant_id, key } },
      create: {
        tenant_id,
        key,
        label: label as unknown as Prisma.InputJsonValue,
        sort_order: index * 10,
      },
      update: {
        label: label as unknown as Prisma.InputJsonValue,
      },
    });
  }
}

export function resolveDocCategoryLabel(
  categories: readonly SiteDocCategory[],
  key: string,
  locale: AppLocale,
  defaultLocale: AppLocale,
): string {
  if (!key) return "";
  const match = categories.find((category) => category.key === key);
  if (!match) return key;
  return resolveCategoryLabel(match.label, locale, defaultLocale);
}

export async function loadCategoryContext(tenant_id: string): Promise<{
  categories: SiteDocCategory[];
  defaultLocale: AppLocale;
}> {
  const [categories, defaultLocale] = await Promise.all([
    listDocCategories(tenant_id),
    resolveDefaultLocale(tenant_id),
  ]);
  return { categories, defaultLocale };
}
